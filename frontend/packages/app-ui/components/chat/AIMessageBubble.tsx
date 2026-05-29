"use client";

import {
	formatTime,
	mapBackendArtifactToProjectArtifact,
	type ProjectArtifact,
	useChatStore,
	useLayoutStore,
} from "@leros/store";
import { artifactApi } from "@leros/store/api/artifactApi";
import type { Message, MessageArtifact } from "@leros/store/types/chat";
import { Avatar, AvatarFallback } from "@leros/ui/components/ui/avatar";
import { Button } from "@leros/ui/components/ui/button";
import { Check, Copy, FileImage, FileText, LoaderCircle, RefreshCw, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArtifactPreviewDialog } from "../layout/ArtifactPreviewDialog";
import { TodoListBlock } from "./TodoListBlock";
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
	const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
	const hasTodos = message.todos && message.todos.length > 0;
	const hasArtifacts = message.artifacts && message.artifacts.length > 0;

	return (
		<div data-slot="ai-message" className="group flex items-start gap-3">
			<Avatar size="sm">
				<AvatarFallback className="bg-blue-500 text-white text-xs">AI</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<div className="mb-1.5 flex items-center gap-2">
					<span className="text-xs font-medium text-slate-500">AI 助手</span>
					<span className="text-xs text-slate-400">{formatTime(message.timestamp)}</span>
					{isStreaming && <span className="text-xs text-blue-500 animate-pulse">生成中</span>}
				</div>

				{hasToolCalls && message.toolCalls && (
					<div className="mb-3">
						<ToolCallBlock toolCalls={message.toolCalls} />
					</div>
				)}

				{hasTodos && message.todos && (
					<div className="mb-3">
						<TodoListBlock todos={message.todos} />
					</div>
				)}

				{hasArtifacts && message.artifacts && (
					<div className="mb-3">
						<MessageArtifactList artifacts={message.artifacts} />
					</div>
				)}

				{hasContent && (
					<div className="w-fit max-w-[min(780px,92%)] rounded-2xl rounded-tl-md bg-white/90 px-4 py-3 text-sm leading-7 text-slate-700 shadow-sm ring-1 ring-slate-200/50">
						<div className="prose prose-slate prose-sm max-w-none prose-p:my-1.5 prose-pre:my-2 prose-ul:my-1.5 prose-ol:my-1.5">
							<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
						</div>
						{isStreaming && (
							<span className="inline-block w-1.5 h-4 bg-slate-400 animate-pulse ml-0.5 rounded-sm" />
						)}
					</div>
				)}

				{!hasContent && !hasToolCalls && !hasTodos && !hasArtifacts && isStreaming && (
					<div className="w-fit rounded-2xl rounded-tl-md bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-200/50">
						<div className="flex items-center gap-1">
							<span className="size-1.5 rounded-full bg-slate-400 animate-pulse" />
							<span className="size-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:200ms]" />
							<span className="size-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:400ms]" />
						</div>
					</div>
				)}

				{!isStreaming && (
					<div className="mt-2 flex items-center gap-3">
						{message.metadata && (
							<div className="flex items-center gap-1.5 text-xs text-slate-400">
								<span>{message.metadata.model}</span>
								<span>·</span>
								<span>{message.metadata.tokens} tokens</span>
								<span>·</span>
								<span>{message.metadata.latency}ms</span>
							</div>
						)}
						<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
							<CopyButton text={content} />
							<Button
								variant="ghost"
								size="icon-xs"
								className="text-slate-400 hover:text-slate-600"
								onClick={() => resendMessage(message.id)}
							>
								<RefreshCw className="size-3.5" />
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
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
		const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
		return taskArtifacts.filter((artifact) => artifactIds.has(artifact.id));
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

	if (!activeTaskDetailTaskId || visibleArtifacts.length === 0) return null;

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
								<MessageArtifactIcon type={artifact.type} />
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

function MessageArtifactIcon({ type }: { type: MessageArtifact["type"] }) {
	const className = "size-4";

	switch (type) {
		case "spreadsheet":
			return <Table2 className={className} />;
		case "image":
			return <FileImage className={className} />;
		default:
			return <FileText className={className} />;
	}
}
