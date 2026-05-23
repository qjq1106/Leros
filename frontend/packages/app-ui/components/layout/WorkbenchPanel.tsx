"use client";

import { useLayoutStore } from "@leros/store";
import { Button } from "@leros/ui/components/ui/button";
import { Bell, ChevronDown, Folder, Plus, Search, SendHorizonal } from "lucide-react";
import { useState } from "react";

const mockActivities = [
	{
		id: "activity-1",
		avatar: "SK",
		name: "Sarah K.",
		project: "backend-v2",
		time: "2 分钟前",
		description: "完成了 API 追踪",
		note: "解决了 auth-middleware 模块中的 4 个延迟问题。系统开销降低了 12%。",
	},
	{
		id: "activity-2",
		avatar: "AL",
		name: "Ada Lovelace",
		project: "frontend-core",
		time: "45 分钟前",
		description: "更新了文档",
		tags: ["文档", "修订版本 3"],
	},
];

export function WorkbenchPanel() {
	const { projects, activeProjectId, selectWorkbenchProject, sendWorkbenchMessage, switchProject } =
		useLayoutStore((s) => s);
	const [input, setInput] = useState("");

	const handleSend = () => {
		if (!input.trim()) return;
		sendWorkbenchMessage(input, activeProjectId);
		setInput("");
	};
	const activeProject = projects.find((project) => project.id === activeProjectId);
	const latestProject = projects[0];

	return (
		<div
			data-slot="workbench-panel"
			className="min-h-0 flex-1 overflow-y-auto bg-[var(--leros-app-bg)]"
		>
			{/* Top Header */}
			<header className="z-10 flex h-16 shrink-0 items-center justify-end px-10">
				<div className="flex items-center gap-4 text-[var(--leros-text)]">
					<button
						type="button"
						className="rounded-full p-2 transition-colors hover:bg-[var(--leros-primary-softer)]"
					>
						<Search className="size-5" />
					</button>
					<button
						type="button"
						className="relative rounded-full p-2 transition-colors hover:bg-[var(--leros-primary-softer)]"
					>
						<Bell className="size-5" />
						<span className="absolute right-2 top-2 size-2 rounded-full border-2 border-[var(--leros-app-bg)] bg-destructive" />
					</button>
				</div>
			</header>

			{/* Main Content Canvas */}
			<div className="z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-10 py-12">
				{/* Welcome/Hero Section */}
				<section className="mb-8">
					<div className="max-w-3xl mx-auto">
						<div className="mb-6 flex flex-col items-start gap-4 text-left">
							<h2 className="text-4xl font-bold tracking-tight text-[var(--leros-text-strong)] md:text-5xl">
								Hi, <span className="text-[var(--leros-primary)]">Mia</span>
							</h2>
							<p className="text-lg font-medium uppercase tracking-widest text-[var(--leros-text-subtle)]">
								以 Leros 智能赋能您的工作流。
							</p>
						</div>

						{/* Enhanced Command Input Card */}
						<div className="flex flex-col rounded-[24px] border border-[var(--leros-control-border)] bg-[var(--leros-surface)] p-4 shadow-sm transition-all focus-within:border-[var(--leros-primary)] focus-within:shadow-md">
							<div className="mb-2 flex gap-3">
								<textarea
									value={input}
									onChange={(event) => setInput(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter" && !event.shiftKey) {
											event.preventDefault();
											handleSend();
										}
									}}
									placeholder="在这里开始新任务，或输入指令以同步您的项目进度..."
									className="h-[60px] flex-1 resize-none border-none bg-transparent text-base text-[var(--leros-chat-input-text)] outline-none placeholder:text-[var(--leros-chat-placeholder)] focus:ring-0"
								/>
							</div>
							<div className="flex items-center justify-between border-t border-[var(--leros-chat-ai-border)] pt-3">
								<div className="flex items-center gap-3">
									<button
										type="button"
										className="rounded-full p-1.5 text-[var(--leros-text-muted)] transition-colors hover:bg-[var(--leros-chat-control-bg)]"
										aria-label="添加附件"
									>
										<Plus className="size-5" />
									</button>
									<div className="relative">
										<Folder className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--leros-text-muted)]" />
										<select
											value={activeProjectId ?? ""}
											onChange={(event) => selectWorkbenchProject(event.target.value || null)}
											className="h-8 min-w-[140px] appearance-none rounded-full border border-[var(--leros-control-border)] bg-[var(--leros-surface)] pl-9 pr-8 text-xs font-semibold text-[var(--leros-text)] outline-none transition-colors hover:border-[var(--leros-focus-ring)]"
											aria-label="新项目"
										>
											<option value="">选择项目</option>
											{projects.map((project) => (
												<option key={project.id} value={project.id}>
													{project.name}
												</option>
											))}
										</select>
										<ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--leros-text-subtle)]" />
									</div>
									{activeProject && (
										<button
											type="button"
											onClick={() => switchProject(activeProject.id)}
											className="text-xs font-semibold text-[var(--leros-primary)] hover:underline"
										>
											打开项目
										</button>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Button
										size="icon"
										onClick={handleSend}
										disabled={!input.trim()}
										className="size-9 rounded-xl bg-[var(--leros-primary)] text-white shadow-sm hover:bg-[var(--leros-primary-strong)] disabled:bg-[var(--leros-chat-control-bg)] disabled:text-[var(--leros-text-subtle)]"
									>
										<SendHorizonal className="size-4" />
									</Button>
								</div>
							</div>
						</div>

						{/* Suggested Actions */}
						<div className="mt-6 flex items-center justify-center gap-4">
							<button
								type="button"
								className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--leros-text-subtle)] transition-colors hover:text-[var(--leros-primary)]"
							>
								分析 SPRINT
							</button>
							<button
								type="button"
								className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--leros-text-subtle)] transition-colors hover:text-[var(--leros-primary)]"
							>
								总结报告
							</button>
						</div>
					</div>
				</section>

				{/* Workbench Grid */}
				<section className="mt-6 grid flex-1 grid-cols-12 gap-10">
					{/* Left: Activity Stream (col-span-8) */}
					<div className="col-span-8">
						<div className="mb-8 flex items-center justify-between border-b border-[var(--leros-control-border)] pb-4">
							<h3 className="text-xl font-bold tracking-tight text-[var(--leros-text-strong)]">
								动态流
							</h3>
							<div className="flex rounded-lg bg-[var(--leros-chat-control-bg)] p-1">
								<button
									type="button"
									className="rounded bg-[var(--leros-surface)] px-4 py-1.5 text-[12px] font-bold text-[var(--leros-text-strong)] shadow-sm"
								>
									今日
								</button>
								<button
									type="button"
									className="px-4 py-1.5 text-[12px] font-bold text-[var(--leros-text-muted)] hover:text-[var(--leros-text-strong)]"
								>
									本周
								</button>
							</div>
						</div>

						<div className="relative space-y-10">
							{mockActivities.map((activity, idx) => (
								<div key={activity.id} className="relative flex gap-6">
									{/* Vertical timeline line */}
									{idx < mockActivities.length - 1 && (
										<div className="absolute bottom-[-40px] left-[19px] top-10 w-[1px] bg-[var(--leros-control-border)]" />
									)}
									<div className="z-10 flex-shrink-0">
										<div className="flex size-10 items-center justify-center rounded-full border-2 border-[var(--leros-surface)] bg-[var(--leros-text-strong)] text-sm font-bold text-white shadow-sm">
											{activity.avatar}
										</div>
									</div>
									<div className="flex-1 pt-0.5">
										<div className="mb-2 flex items-baseline justify-between">
											<p className="text-sm text-[var(--leros-text)]">
												<span className="font-bold text-[var(--leros-text-strong)]">
													{activity.name}
												</span>
												<span> 在 </span>
												<button
													type="button"
													className="font-semibold text-[var(--leros-primary)] hover:underline"
													onClick={() => switchProject(activity.project)}
												>
													{activity.project}
												</button>
												<span> 中{activity.description}</span>
											</p>
											<span className="text-[11px] font-medium text-[var(--leros-text-subtle)]">
												{activity.time}
											</span>
										</div>
										{activity.note ? (
											<div className="rounded-xl bg-[var(--leros-chat-control-bg)] p-4 text-[13px] leading-relaxed text-[var(--leros-text)]">
												“{activity.note}”
											</div>
										) : null}
										{activity.tags ? (
											<div className="mt-2 flex items-center gap-2">
												{activity.tags.map((tag) => (
													<span
														key={tag}
														className="rounded bg-[var(--leros-chat-control-bg)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--leros-text)]"
													>
														{tag}
													</span>
												))}
											</div>
										) : null}
									</div>
								</div>
							))}

							{latestProject && (
								<div className="mt-6 rounded-2xl border border-[var(--leros-primary-soft)] bg-[var(--leros-primary-softer)] px-5 py-4 text-xs text-[var(--leros-primary-strong)]">
									最近项目：{latestProject.name} · {latestProject.description}
								</div>
							)}
						</div>
					</div>

					{/* Right: Stats & Promotion (col-span-4) */}
					<div className="col-span-4 space-y-10">
						{/* ToDo card */}
						<div className="rounded-2xl border border-[var(--leros-control-border)] bg-[var(--leros-surface)] p-6 shadow-sm">
							<h4 className="mb-6 text-[11px] font-bold uppercase tracking-widest text-[var(--leros-text-subtle)]">
								待办事项
							</h4>
							<div className="space-y-5">
								<div className="-mx-2 flex cursor-pointer flex-col gap-2 rounded-lg p-2 transition-colors hover:bg-[var(--leros-surface-soft)]">
									<div className="flex items-center justify-between">
										<p className="flex-1 truncate text-[13px] font-bold text-[var(--leros-text-strong)]">
											优化数据库查询性能
										</p>
										<span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
											待处理
										</span>
									</div>
									<div className="flex items-center gap-2 text-[var(--leros-text-subtle)]">
										<span className="text-[11px] font-medium">backend-v2</span>
									</div>
								</div>
								<div className="-mx-2 flex cursor-pointer flex-col gap-2 rounded-lg p-2 transition-colors hover:bg-[var(--leros-surface-soft)]">
									<div className="flex items-center justify-between">
										<p className="flex-1 truncate text-[13px] font-bold text-[var(--leros-text-strong)]">
											前端 UI 组件化重构
										</p>
										<span className="rounded bg-[var(--leros-primary-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--leros-primary)]">
											进行中
										</span>
									</div>
									<div className="flex items-center gap-2 text-[var(--leros-text-subtle)]">
										<span className="text-[11px] font-medium">frontend-core</span>
									</div>
								</div>
								<div className="-mx-2 flex cursor-pointer flex-col gap-2 rounded-lg p-2 transition-colors hover:bg-[var(--leros-surface-soft)]">
									<div className="flex items-center justify-between">
										<p className="flex-1 truncate text-[13px] font-bold text-[var(--leros-text-strong)]">
											基础设施安全审计
										</p>
										<span className="rounded bg-[var(--leros-chat-control-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--leros-text)]">
											待处理
										</span>
									</div>
									<div className="flex items-center gap-2 text-[var(--leros-text-subtle)]">
										<span className="text-[11px] font-medium">infra</span>
									</div>
								</div>
							</div>
						</div>

						{/* Recent Visit files card */}
						<div className="rounded-2xl border border-[var(--leros-control-border)] bg-[var(--leros-surface)] p-6 shadow-sm">
							<h4 className="mb-6 text-[11px] font-bold uppercase tracking-widest text-[var(--leros-text-subtle)]">
								最近访问
							</h4>
							<div className="space-y-5">
								<div className="-mx-2 flex cursor-pointer items-center gap-4 rounded-lg p-2 transition-colors hover:bg-[var(--leros-surface-soft)]">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
										<span className="text-xs font-bold font-mono">PDF</span>
									</div>
									<div className="flex-1 min-w-0">
										<p className="truncate text-[13px] font-bold text-[var(--leros-text-strong)]">
											Q4 产品规划指南.pdf
										</p>
										<p className="text-[11px] text-[var(--leros-text-subtle)]">今天 10:45</p>
									</div>
								</div>
								<div className="-mx-2 flex cursor-pointer items-center gap-4 rounded-lg p-2 transition-colors hover:bg-[var(--leros-surface-soft)]">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--leros-primary-softer)] text-[var(--leros-primary)]">
										<span className="text-xs font-bold font-mono">DOC</span>
									</div>
									<div className="flex-1 min-w-0">
										<p className="truncate text-[13px] font-bold text-[var(--leros-text-strong)]">
											后端架构重构草案.docx
										</p>
										<p className="text-[11px] text-[var(--leros-text-subtle)]">昨天 16:20</p>
									</div>
								</div>
								<div className="-mx-2 flex cursor-pointer items-center gap-4 rounded-lg p-2 transition-colors hover:bg-[var(--leros-surface-soft)]">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--leros-chat-control-bg)] text-[var(--leros-text-muted)]">
										<span className="text-xs font-bold font-mono">PNG</span>
									</div>
									<div className="flex-1 min-w-0">
										<p className="truncate text-[13px] font-bold text-[var(--leros-text-strong)]">
											v0.2 设计手稿.png
										</p>
										<p className="text-[11px] text-[var(--leros-text-subtle)]">10月24日</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
