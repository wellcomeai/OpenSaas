"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ExternalLink,
  FileCode,
  FileText,
  GitBranch,
  Loader2,
  Plus,
  Send,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { codeaiApi } from "@/api/codeai";
import { cn, formatDateTime } from "@/lib/utils";
import { useSessionStream } from "@/hooks/useSessionStream";
import type {
  CodeAIMessage,
  CodeAIPlan,
  CodeAISessionStatus,
} from "@/types/codeai";

interface AgentBlock {
  key: string;
  kind: "status" | "tool_read" | "diff" | "plan" | "done" | "error";
  // status
  message?: string;
  state?: "running" | "ok" | "error";
  // tool_read
  files?: string[];
  // diff
  path?: string;
  action?: string;
  diff?: string;
  // plan
  plan?: CodeAIPlan;
  // done
  pr_url?: string;
}

export default function CodeAIProjectChatPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const qc = useQueryClient();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["codeai-projects"],
    queryFn: () => codeaiApi.listProjects(),
  });
  const project = projects?.find((p) => p.id === projectId);

  const { data: settings } = useQuery({
    queryKey: ["codeai-settings"],
    queryFn: () => codeaiApi.getSettings(),
  });

  const { data: sessions } = useQuery({
    queryKey: ["codeai-sessions", projectId],
    queryFn: () => codeaiApi.listProjectSessions(projectId),
    enabled: Boolean(projectId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!activeSessionId && sessions && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const createMut = useMutation({
    mutationFn: (task: string) =>
      codeaiApi.createSession({ project_id: projectId, task }),
    onSuccess: (s) => {
      setActiveSessionId(s.id);
      setNewTask("");
      qc.invalidateQueries({ queryKey: ["codeai-sessions", projectId] });
    },
    onError: () => toast.error("Не удалось создать сессию"),
  });

  return (
    <div className="-m-6 grid h-[calc(100vh-3.5rem)] grid-cols-[220px_1fr]">
      {/* Left panel */}
      <aside className="flex flex-col overflow-y-auto border-r bg-muted/20 p-4">
        <Link
          href="/codeai"
          className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Назад
        </Link>

        <div className="mb-4">
          <div className="font-mono text-sm font-medium">
            {project?.repo_full_name ?? "..."}
          </div>
        </div>

        <div className="mb-4 text-xs text-muted-foreground">
          <div className="mb-1 font-semibold uppercase tracking-wider">
            Модели
          </div>
          <div>Plan: {settings?.planning_model ?? "—"}</div>
          <div>Edit: {settings?.editing_model ?? "—"}</div>
          <Link
            href="/codeai/settings"
            className="text-primary hover:underline"
          >
            Изменить →
          </Link>
        </div>

        <div className="my-2 border-t" />

        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Сессии
          <button
            type="button"
            onClick={() => setActiveSessionId(null)}
            className="rounded p-1 hover:bg-muted"
            title="Новая задача"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {sessions?.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSessionId(s.id)}
              className={cn(
                "rounded-md p-2 text-left text-xs",
                activeSessionId === s.id ? "bg-primary/10" : "hover:bg-muted",
              )}
            >
              <div className="line-clamp-2 font-medium text-foreground">
                {s.task}
              </div>
              <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                <StatusBadge status={s.status} />
                <span>{formatDateTime(s.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Center chat area */}
      <section className="flex flex-col overflow-hidden">
        {activeSessionId ? (
          <SessionView
            sessionId={activeSessionId}
            projectId={projectId}
          />
        ) : (
          <NewTaskView
            task={newTask}
            onChange={setNewTask}
            onSubmit={() => {
              if (newTask.trim()) createMut.mutate(newTask.trim());
            }}
            isPending={createMut.isPending}
          />
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: CodeAISessionStatus }) {
  const map: Record<CodeAISessionStatus, { label: string; cls: string }> = {
    idle: { label: "idle", cls: "bg-muted text-muted-foreground" },
    planning: { label: "planning", cls: "bg-yellow-100 text-yellow-800" },
    awaiting_confirmation: {
      label: "ждёт",
      cls: "bg-blue-100 text-blue-800",
    },
    executing: { label: "выполняется", cls: "bg-blue-100 text-blue-800" },
    done: { label: "done", cls: "bg-green-100 text-green-800" },
    error: { label: "error", cls: "bg-red-100 text-red-800" },
  };
  const v = map[status];
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", v.cls)}>
      {v.label}
    </span>
  );
}

function NewTaskView({
  task,
  onChange,
  onSubmit,
  isPending,
}: {
  task: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Новая задача</h2>
          <p className="text-sm text-muted-foreground">
            Опишите что нужно изменить в репозитории. CodeAI составит план и
            покажет его на подтверждение перед коммитом.
          </p>
        </div>
        <Textarea
          rows={5}
          value={task}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Например: Добавь Google OAuth авторизацию"
        />
        <Button
          onClick={onSubmit}
          disabled={!task.trim() || isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Создать задачу
        </Button>
      </div>
    </div>
  );
}

function SessionView({
  sessionId,
  projectId,
}: {
  sessionId: string;
  projectId: string;
}) {
  const qc = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ["codeai-session", sessionId],
    queryFn: () => codeaiApi.getSession(sessionId),
    refetchInterval: 3000,
  });

  const { data: messages } = useQuery({
    queryKey: ["codeai-messages", sessionId],
    queryFn: () => codeaiApi.getMessages(sessionId),
    refetchInterval: 3000,
  });

  const stream = useSessionStream(
    session &&
      (session.status === "planning" || session.status === "executing")
      ? sessionId
      : null,
  );

  useEffect(() => {
    if (stream.events.length === 0) return;
    const last = stream.events[stream.events.length - 1];
    if (last.type === "done" || last.type === "error" || last.type === "plan") {
      qc.invalidateQueries({ queryKey: ["codeai-session", sessionId] });
      qc.invalidateQueries({ queryKey: ["codeai-messages", sessionId] });
      qc.invalidateQueries({ queryKey: ["codeai-sessions", projectId] });
    }
  }, [stream.events, qc, sessionId, projectId]);

  const confirmMut = useMutation({
    mutationFn: () => codeaiApi.confirmPlan(sessionId),
    onSuccess: () => {
      toast.success("План подтверждён");
      qc.invalidateQueries({ queryKey: ["codeai-session", sessionId] });
    },
  });

  const cancelMut = useMutation({
    mutationFn: () => codeaiApi.cancelSession(sessionId),
    onSuccess: () => {
      toast.message("Сессия отменена");
      qc.invalidateQueries({ queryKey: ["codeai-session", sessionId] });
    },
  });

  const blocks = useMemo<AgentBlock[]>(() => {
    return buildAgentBlocks(
      messages ?? [],
      stream.events as StreamEvent[],
      session?.plan ?? null,
      session?.status ?? "idle",
      session?.pr_url ?? null,
    );
  }, [messages, stream.events, session?.plan, session?.status, session?.pr_url]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [blocks]);

  if (!session) {
    return <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Timeline */}
      <div className="flex items-center gap-4 border-b p-4 text-xs">
        <TimelineStep
          label="Анализ"
          active={session.status === "planning"}
          done={["awaiting_confirmation", "executing", "done"].includes(session.status)}
        />
        <TimelineStep
          label="Подтверждение"
          active={session.status === "awaiting_confirmation"}
          done={["executing", "done"].includes(session.status)}
        />
        <TimelineStep
          label="Выполнение"
          active={session.status === "executing"}
          done={session.status === "done"}
        />
        <TimelineStep label="Готово" active={false} done={session.status === "done"} />
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-6">
        <UserBubble text={session.task} />

        {blocks.map((b) => (
          <AgentBlockView
            key={b.key}
            block={b}
            onConfirm={() => confirmMut.mutate()}
            onCancel={() => cancelMut.mutate()}
            isPlanPending={confirmMut.isPending || cancelMut.isPending}
            isPlanActive={session.status === "awaiting_confirmation"}
          />
        ))}

        {session.status === "error" && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <div className="flex items-center gap-2 font-semibold">
              <XCircle className="h-5 w-5" /> Ошибка при выполнении задачи
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineStep({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : active ? (
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" />
      )}
      <span
        className={cn(
          done
            ? "text-green-700"
            : active
              ? "text-blue-700"
              : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
        {text}
      </div>
    </div>
  );
}

// === AgentBlock ===

interface StreamEvent {
  type: string;
  message?: string;
  files?: string[];
  path?: string;
  action?: string;
  diff?: string;
  plan?: CodeAIPlan;
  pr_url?: string;
  branch_name?: string;
}

function buildAgentBlocks(
  messages: CodeAIMessage[],
  events: StreamEvent[],
  plan: CodeAIPlan | null,
  status: CodeAISessionStatus,
  prUrl: string | null,
): AgentBlock[] {
  const blocks: AgentBlock[] = [];

  for (const m of messages) {
    if (m.role === "user") continue;
    if (m.message_type === "status") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      if (meta.tool === "read" && Array.isArray(meta.files)) {
        blocks.push({
          key: `msg-${m.id}`,
          kind: "tool_read",
          files: meta.files as string[],
        });
        continue;
      }
      blocks.push({
        key: `msg-${m.id}`,
        kind: "status",
        message: m.content,
        state: "ok",
      });
      continue;
    }
    if (m.message_type === "diff") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      blocks.push({
        key: `msg-${m.id}`,
        kind: "diff",
        path: (meta.path as string) ?? "",
        action: (meta.action as string) ?? "modify",
        diff: m.content,
      });
      continue;
    }
    if (m.message_type === "plan") {
      // Plan card is rendered from session.plan below when relevant.
      continue;
    }
  }

  // Append live stream events that aren't already captured in persisted messages.
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const key = `ev-${i}`;
    if (e.type === "status") {
      blocks.push({
        key,
        kind: "status",
        message: e.message,
        state: "running",
      });
    } else if (e.type === "tool_read") {
      blocks.push({
        key,
        kind: "tool_read",
        files: e.files ?? [],
      });
    } else if (e.type === "diff") {
      blocks.push({
        key,
        kind: "diff",
        path: e.path,
        action: e.action,
        diff: e.diff,
      });
    } else if (e.type === "error") {
      blocks.push({
        key,
        kind: "status",
        message: e.message ?? "error",
        state: "error",
      });
    }
  }

  // Mark in-flight statuses: only the last status block in a running session keeps "running".
  if (status !== "planning" && status !== "executing") {
    for (const b of blocks) {
      if (b.kind === "status" && b.state === "running") b.state = "ok";
    }
  } else {
    const runningIdxs = blocks
      .map((b, i) => (b.kind === "status" && b.state === "running" ? i : -1))
      .filter((i) => i >= 0);
    for (let i = 0; i < runningIdxs.length - 1; i++) {
      blocks[runningIdxs[i]].state = "ok";
    }
  }

  if (
    plan &&
    (status === "awaiting_confirmation" ||
      status === "executing" ||
      status === "done")
  ) {
    blocks.push({ key: "plan", kind: "plan", plan });
  }

  if (status === "done" && prUrl) {
    blocks.push({ key: "done", kind: "done", pr_url: prUrl });
  }

  return blocks;
}

function AgentBlockView({
  block,
  onConfirm,
  onCancel,
  isPlanPending,
  isPlanActive,
}: {
  block: AgentBlock;
  onConfirm: () => void;
  onCancel: () => void;
  isPlanPending: boolean;
  isPlanActive: boolean;
}) {
  switch (block.kind) {
    case "status":
      return <StatusBlock message={block.message ?? ""} state={block.state ?? "ok"} />;
    case "tool_read":
      return <ToolReadBlock files={block.files ?? []} />;
    case "diff":
      return (
        <DiffBlock
          path={block.path ?? ""}
          action={block.action ?? "modify"}
          diff={block.diff ?? ""}
        />
      );
    case "plan":
      return block.plan ? (
        <PlanBlock
          plan={block.plan}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isPending={isPlanPending}
          isActive={isPlanActive}
        />
      ) : null;
    case "done":
      return <DoneBlock prUrl={block.pr_url ?? ""} />;
    default:
      return null;
  }
}

function StatusBlock({
  message,
  state,
}: {
  message: string;
  state: "running" | "ok" | "error";
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {state === "running" && (
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-500" />
      )}
      {state === "ok" && (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
      )}
      {state === "error" && (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      )}
      <span
        className={cn(
          "leading-5",
          state === "error" ? "text-red-700" : "text-foreground",
        )}
      >
        {message}
      </span>
    </div>
  );
}

function Collapsible({
  defaultOpen,
  header,
  children,
}: {
  defaultOpen: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">{header}</div>
      </button>
      {open && <div className="border-t bg-muted/20">{children}</div>}
    </div>
  );
}

function ToolReadBlock({ files }: { files: string[] }) {
  return (
    <Collapsible
      defaultOpen={false}
      header={
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Читаю файлы</span>
          <span className="text-xs text-muted-foreground">
            ({files.length})
          </span>
        </div>
      }
    >
      <ul className="space-y-1 p-3 text-xs">
        {files.map((f) => (
          <li key={f} className="flex items-center gap-1.5 font-mono">
            <FileCode className="h-3 w-3 text-muted-foreground" />
            {f}
          </li>
        ))}
      </ul>
    </Collapsible>
  );
}

function DiffBlock({
  path,
  action,
  diff,
}: {
  path: string;
  action: string;
  diff: string;
}) {
  const stats = useMemo(() => {
    let add = 0;
    let del = 0;
    for (const line of diff.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) add++;
      else if (line.startsWith("-") && !line.startsWith("---")) del++;
    }
    return { add, del };
  }, [diff]);

  return (
    <Collapsible
      defaultOpen={false}
      header={
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="truncate font-mono text-xs">{path}</span>
          <Badge variant="outline" className="text-[10px]">
            {action}
          </Badge>
          <span className="ml-auto text-xs">
            <span className="text-green-600">+{stats.add}</span>{" "}
            <span className="text-red-600">−{stats.del}</span>
          </span>
        </div>
      }
    >
      <pre className="max-h-96 overflow-auto p-0 font-mono text-xs leading-5">
        {diff.split("\n").map((line, i) => {
          let cls = "px-3";
          if (line.startsWith("+++") || line.startsWith("---")) {
            cls = "px-3 text-muted-foreground";
          } else if (line.startsWith("+")) {
            cls = "px-3 bg-green-50 text-green-900";
          } else if (line.startsWith("-")) {
            cls = "px-3 bg-red-50 text-red-900";
          } else if (line.startsWith("@@")) {
            cls = "px-3 bg-muted/60 text-muted-foreground";
          }
          return (
            <div key={i} className={cls}>
              {line || " "}
            </div>
          );
        })}
      </pre>
    </Collapsible>
  );
}

function PlanBlock({
  plan,
  onConfirm,
  onCancel,
  isPending,
  isActive,
}: {
  plan: CodeAIPlan;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  isActive: boolean;
}) {
  return (
    <Collapsible
      defaultOpen
      header={
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-blue-600" />
          <span className="font-medium">План изменений</span>
          <span className="text-xs text-muted-foreground">
            ({plan.files_to_change.length} файлов)
          </span>
        </div>
      }
    >
      <div className="space-y-3 p-3 text-sm">
        {plan.reasoning && (
          <p className="text-muted-foreground">{plan.reasoning}</p>
        )}
        <ul className="space-y-1.5">
          {plan.files_to_change.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <span className="font-mono text-xs">{f.path}</span>{" "}
                <Badge variant="outline" className="text-[10px]">
                  {f.action}
                </Badge>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          <span className="font-mono">{plan.branch_name}</span>
        </div>
        {isActive && (
          <div className="flex gap-2 pt-1">
            <Button onClick={onConfirm} disabled={isPending} size="sm">
              ✓ Подтвердить
            </Button>
            <Button
              onClick={onCancel}
              disabled={isPending}
              size="sm"
              variant="outline"
            >
              ✗ Отменить
            </Button>
          </div>
        )}
      </div>
    </Collapsible>
  );
}

function DoneBlock({ prUrl }: { prUrl: string }) {
  return (
    <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
      <div className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="h-5 w-5" />
        Pull Request создан
      </div>
      <a
        href={prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 underline"
      >
        {prUrl}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
