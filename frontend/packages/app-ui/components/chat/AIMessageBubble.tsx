"use client";

import {
	formatTime,
	getAssistantMessageFooterSegments,
	mapBackendArtifactToProjectArtifact,
	mergeProjectArtifacts,
	messageArtifactToProjectArtifact,
	type ProjectArtifact,
	useChatStore,
	useLayoutStore,
} from "@leros/store";
import { artifactApi } from "@leros/store/api/artifactApi";
import type {
	Message,
	MessageArtifact,
	MessageProcessStep,
	ToolCall,
} from "@leros/store/types/chat";
import { Avatar, AvatarFallback } from "@leros/ui/components/ui/avatar";
import { Button } from "@leros/ui/components/ui/button";
import {
	Brain,
	Check,
	ChevronDown,
	ChevronRight,
	Copy,
	LoaderCircle,
	RefreshCw,
	Rows3,
	Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	SHOW_ASSISTANT_MESSAGE_METRICS,
	SHOW_ASSISTANT_MESSAGE_REGENERATE_BUTTON,
} from "../../constants/temporaryUiFlags";
import { MarkdownRenderer } from "../common/MarkdownRenderer";
import { ArtifactPreviewDialog } from "../layout/ArtifactPreviewDialog";
import { ProjectFileTypeIcon } from "../layout/project-file-type-icon";
import { ToolCallBlock } from "./ToolCallBlock";

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	const handleCopy = () => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
	return (
		<Button
			variant="ghost"
			size="icon-xs"
			className={copied ? "text-green-500" : "text-slate-400 hover:text-slate-600"}
			onClick={handleCopy}
		>
			{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
		</Button>
	);
}

export function AIMessageBubble({
	message,
	isStreaming,
}: {
	message: Message;
	isStreaming: boolean;
}) {
	const { resendMessage } = useChatStore((s) => s);
	const content = message.content;
	const hasContent = content.trim().length > 0;
	const hasProcess = Boolean(message.processSteps?.length);
	const hasArtifacts = message.artifacts && message.artifacts.length > 0;
	const metricSegments = SHOW_ASSISTANT_MESSAGE_METRICS
		? getAssistantMessageFooterSegments(message)
		: [];

	return (
		<div data-slot="ai-message" className="group flex items-start gap-3">
			<Avatar size="sm">
				<AvatarFallback className="bg-blue-500 text-white text-xs">AI</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<div className="mb-1.5 flex items-center gap-2">
					<span className="text-xs font-medium text-slate-500">AI 助手</span>
					<span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
					{isStreaming && <span className="animate-pulse text-xs text-blue-500">生成中</span>}
				</div>

				{hasProcess && message.processSteps && (
					<div className="mb-3">
						<ProcessTimelineBlock
							steps={message.processSteps}
							toolCalls={message.toolCalls ?? []}
							isStreaming={isStreaming}
						/>
					</div>
				)}

				{hasContent && (
					<div className="mb-3">
						<div className="w-fit max-w-[min(780px,92%)] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-7 text-slate-800 shadow-md ring-1 ring-slate-200/70">
							<MarkdownRenderer
								content={content}
								className="prose prose-slate prose-sm max-w-none prose-p:my-1.5 prose-pre:my-2 prose-ul:my-1.5 prose-ol:my-1.5"
							/>
							{isStreaming && (
								<span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-slate-400" />
							)}
						</div>
					</div>
				)}

				{hasArtifacts && message.artifacts && (
					<div className="mb-3">
						<MessageArtifactList artifacts={message.artifacts} />
					</div>
				)}

				{!hasContent && !hasProcess && !hasArtifacts && isStreaming && (
					<div className="w-fit rounded-2xl rounded-tl-md bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-200/50">
						<div className="flex items-center gap-1">
							<span className="size-1.5 animate-pulse rounded-full bg-slate-400" />
							<span className="size-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:200ms]" />
							<span className="size-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:400ms]" />
						</div>
					</div>
				)}

				{!isStreaming && (
					<div className="mt-2 flex items-center gap-3">
						{metricSegments.length > 0 && (
							<div className="text-xs text-slate-400">{metricSegments.join(" · ")}</div>
						)}
						<div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
							<CopyButton text={content} />
							{SHOW_ASSISTANT_MESSAGE_REGENERATE_BUTTON && (
								<Button
									variant="ghost"
									size="icon-xs"
									className="text-slate-400 hover:text-slate-600"
									onClick={() => resendMessage(message.id)}
								>
									<RefreshCw className="size-3.5" />
								</Button>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function ProcessTimelineBlock({
	steps,
	toolCalls,
	isStreaming,
}: {
	steps: MessageProcessStep[];
	toolCalls: ToolCall[];
	isStreaming: boolean;
}) {
	const [expanded, setExpanded] = useState(isStreaming);
	const [autoFollow, setAutoFollow] = useState(true);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const toolCallMap = useMemo(
		() => new Map(toolCalls.map((toolCall) => [toolCall.id, toolCall] as const)),
		[toolCalls],
	);
	const preview = useMemo(() => {
		for (const step of steps) {
			if (step.type === "thinking") {
				const compact = compactText(step.content);
				if (compact) return compact;
				continue;
			}
			const toolCall = toolCallMap.get(step.toolCallId);
			if (toolCall?.name?.trim()) return `工具调用：${toolCall.name}`;
		}
		return "";
	}, [steps, toolCallMap]);

	useEffect(() => {
		setExpanded(isStreaming);
	}, [isStreaming]);

	useEffect(() => {
		if (!expanded || !autoFollow) return;

		const container = scrollContainerRef.current;
		if (!container) return;

		// 默认跟随最新步骤，只有用户主动上滑离开底部时才暂停自动滚动。
		container.scrollTop = container.scrollHeight;
	}, [autoFollow, expanded, steps, toolCalls]);

	if (!steps.length) return null;

	return (
		<div
			data-slot="process-timeline-block"
			className="max-w-[min(780px,92%)] overflow-hidden rounded-lg border border-slate-200/80 bg-white/70 text-slate-500 shadow-sm"
		>
			<button
				type="button"
				onClick={() => {
					setExpanded((value) => {
						const nextExpanded = !value;
						if (nextExpanded) {
							setAutoFollow(true);
						}
						return nextExpanded;
					});
				}}
				className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50/90"
			>
				<div className="flex min-w-0 items-center gap-2">
					{expanded ? (
						<ChevronDown className="size-3.5 shrink-0 text-slate-400" />
					) : (
						<ChevronRight className="size-3.5 shrink-0 text-slate-400" />
					)}
					<Rows3 className="size-3.5 shrink-0 text-indigo-500" />
					<span className="truncate font-medium text-slate-600">执行过程</span>
					{isStreaming && (
						<span className="relative flex size-2 shrink-0">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-blue-500" />
						</span>
					)}
				</div>
				{!expanded && preview && (
					<span className="max-w-[54%] truncate text-xs text-slate-500">{preview}</span>
				)}
			</button>
			{expanded && (
				<div className="border-t border-slate-200 px-3 py-3">
					<div
						ref={scrollContainerRef}
						onScroll={(event) => {
							const container = event.currentTarget;
							const distanceToBottom =
								container.scrollHeight - container.scrollTop - container.clientHeight;

							setAutoFollow(distanceToBottom <= 24);
						}}
						className="no-scrollbar max-h-[min(45vh,25rem)] space-y-3 overflow-y-auto pr-1"
					>
						{steps.map((step, index) => (
							<ProcessStepItem
								key={step.id}
								step={step}
								index={index}
								toolCall={step.type === "tool_call" ? toolCallMap.get(step.toolCallId) : undefined}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function ProcessStepItem({
	step,
	index,
	toolCall,
}: {
	step: MessageProcessStep;
	index: number;
	toolCall?: ToolCall;
}) {
	return (
		<div className="flex gap-3">
			<div className="flex w-6 shrink-0 flex-col items-center">
				<div className="flex size-6 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-[11px] font-medium text-blue-600">
					{index + 1}
				</div>
				<div className="mt-1 min-h-4 w-px flex-1 bg-slate-200" />
			</div>
			<div className="min-w-0 flex-1 pb-1">
				{step.type === "thinking" ? (
					<div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm">
						<div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
							<Brain className="size-3.5 text-blue-500" />
							<span>思考过程</span>
						</div>
						<MarkdownRenderer
							content={step.content}
							className="prose prose-slate prose-sm max-w-none prose-p:my-1.5 prose-pre:my-2 prose-ul:my-1.5 prose-ol:my-1.5"
						/>
					</div>
				) : toolCall ? (
					<div>
						<div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
							<Wrench className="size-3.5 text-emerald-500" />
							<span>工具调用</span>
						</div>
						<ToolCallBlock toolCalls={[toolCall]} />
					</div>
				) : null}
			</div>
		</div>
	);
}

function compactText(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function MessageArtifactList({ artifacts }: { artifacts: MessageArtifact[] }) {
	const [previewArtifact, setPreviewArtifact] = useState<ProjectArtifact | null>(null);
	const [taskArtifacts, setTaskArtifacts] = useState<ProjectArtifact[]>([]);
	const [loadingArtifactId, setLoadingArtifactId] = useState<string | null>(null);
	const activeTaskDetailTaskId = useLayoutStore((s) => s.activeTaskDetailTaskId);
	const artifactKey = useMemo(
		() => artifacts.map((artifact) => artifact.id).join("|"),
		[artifacts],
	);
	const visibleArtifacts = useMemo(() => {
		const sessionArtifacts = artifacts.map(messageArtifactToProjectArtifact);
		const artifactIds = new Set(sessionArtifacts.map((artifact) => artifact.id));
		const enrichedTaskArtifacts = taskArtifacts.filter((artifact) => artifactIds.has(artifact.id));
		return mergeProjectArtifacts(enrichedTaskArtifacts, sessionArtifacts);
	}, [artifacts, taskArtifacts]);

	useEffect(() => {
		if (!activeTaskDetailTaskId) {
			setTaskArtifacts([]);
			return;
		}
		const taskId = activeTaskDetailTaskId;

		let cancelled = false;
		async function fetchTaskArtifacts() {
			setLoadingArtifactId("__list__");
			try {
				const res = await artifactApi.listTaskArtifacts(taskId);
				if (cancelled) return;
				setTaskArtifacts((res.data.data ?? []).map(mapBackendArtifactToProjectArtifact));
			} catch (err) {
				if (cancelled) return;
				console.error("MessageArtifactList fetch task artifacts error:", err);
				setTaskArtifacts([]);
			} finally {
				if (!cancelled) setLoadingArtifactId(null);
			}
		}
		fetchTaskArtifacts();
		return () => {
			cancelled = true;
		};
	}, [activeTaskDetailTaskId, artifactKey]);

	if (visibleArtifacts.length === 0) return null;

	return (
		<>
			<div className="grid max-w-[min(780px,92%)] gap-2 sm:grid-cols-2">
				{visibleArtifacts.map((artifact) => (
					<button
						type="button"
						key={artifact.id}
						onClick={() => setPreviewArtifact(artifact)}
						disabled={loadingArtifactId === artifact.id}
						className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/70 bg-white/90 px-3.5 py-3 text-left shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/60"
						title="预览产物"
					>
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-slate-600">
							{loadingArtifactId === artifact.id ? (
								<LoaderCircle className="size-4 animate-spin" />
							) : (
								<MessageArtifactIcon fileName={artifact.name} />
							)}
						</div>
						<div className="min-w-0">
							<div className="truncate text-sm font-semibold leading-5 text-slate-700">
								{artifact.title || artifact.name}
							</div>
							<div className="mt-0.5 truncate text-xs leading-4 text-slate-400">
								{artifact.name}
								{artifact.size ? ` · ${artifact.size}` : ""}
							</div>
						</div>
					</button>
				))}
			</div>
			<ArtifactPreviewDialog
				artifact={previewArtifact}
				open={previewArtifact !== null}
				onOpenChange={(open) => {
					if (!open) setPreviewArtifact(null);
				}}
			/>
		</>
	);
}

function MessageArtifactIcon({ fileName }: { fileName: string }) {
	return <ProjectFileTypeIcon fileName={fileName} className="size-4 object-contain" />;
}
