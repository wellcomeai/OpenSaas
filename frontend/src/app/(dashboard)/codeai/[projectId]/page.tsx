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
  ExternalLink,
  FileCode,
  Loader2,
  Plus,
  Send,
  Terminal,
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
  CodeAIModel,
  CodeAISession,
  CodeAISessionStatus,
} from "@/types/codeai";

export default function CodeAIProjectChatPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const qc = useQueryClient();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["codeai-projects"],
    queryFn: () => codeaiApi.listProjects(),
  });
  const project = projects?.find((p) => p.id === projectId);

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

  return (
    <div className="-m-6 grid h-[calc(100vh-3.5rem)] grid-cols-[240px_1fr]">
      <aside className="flex flex-col overflow-y-auto border-r bg-muted/20 p-4">
        <Link
          href="/codeai"
          className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Назад
        </Link>

        <div className="mb-3">
          <div className="font-mono text-sm font-medium">
            {project?.repo_full_name ?? "..."}
          </div>
        </div>

        <ModelSelector />

        <div className="my-3 border-t" />

        <button
          type="button"
          onClick={() => setActiveSessionId(null)}
          className="mb-3 inline-flex items-center justify-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs hover:bg-muted"
        >
          <Plus className="h-3.5 w-3.5" /> Новая задача
        </button>

        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Сессии
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

      <section className="flex flex-col overflow-hidden">
        {activeSessionId ? (
          <SessionView
            key={activeSessionId}
            sessionId={activeSessionId}
            projectId={projectId}
          />
        ) : (
          <NewTaskView
            projectId={projectId}
            onCreated={(id) => setActiveSessionId(id)}
          />
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: CodeAISessionStatus }) {
  const map: Record<CodeAISessionStatus, { label: string; cls: string }> = {
    idle: { label: "idle", cls: "bg-muted text-muted-foreground" },
    planning: { label: "думает", cls: "bg-blue-100 text-blue-800" },
    awaiting_confirmation: {
      label: "ждёт",
      cls: "bg-blue-100 text-blue-800",
    },
    executing: { label: "работает", cls: "bg-blue-100 text-blue-800" },
    done: { label: "готово", cls: "bg-green-100 text-green-800" },
    error: { label: "ошибка", cls: "bg-red-100 text-red-800" },
  };
  const v = map[status];
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", v.cls)}>
      {v.label}
    </span>
  );
}

function ModelSelector() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["codeai-settings"],
    queryFn: () => codeaiApi.getSettings(),
  });
  const { data: models } = useQuery({
    queryKey: ["codeai-models"],
    queryFn: () => codeaiApi.getAvailableModels(),
  });

  const updateMut = useMutation({
    mutationFn: (model: string) => codeaiApi.updateSettings({ model }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["codeai-settings"] });
    },
    onError: () => toast.error("Не удалось сменить модель"),
  });

  const opts = useMemo<CodeAIModel[]>(() => {
    if (!models) return [];
    return [...models].sort((a, b) => a.id.localeCompare(b.id));
  }, [models]);

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Модель
      </label>
      <select
        className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-mono"
        value={settings?.model ?? ""}
        onChange={(e) => updateMut.mutate(e.target.value)}
        disabled={!settings || updateMut.isPending}
      >
        {!settings && <option>...</option>}
        {settings &&
          !opts.find((m) => m.id === settings.model) && (
            <option value={settings.model}>{settings.model}</option>
          )}
        {opts.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id}
          </option>
        ))}
      </select>
    </div>
  );
}

function NewTaskView({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: (sessionId: string) => void;
}) {
  const qc = useQueryClient();
  const [task, setTask] = useState("");

  const createMut = useMutation({
    mutationFn: (text: string) =>
      codeaiApi.createSession({ project_id: projectId, task: text }),
    onSuccess: (s) => {
      onCreated(s.id);
      qc.invalidateQueries({ queryKey: ["codeai-sessions", projectId] });
    },
    onError: () => toast.error("Не удалось создать сессию"),
  });

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Новая задача</h2>
          <p className="text-sm text-muted-foreground">
            Напиши что нужно сделать — задать вопрос, починить баг, добавить
            фичу. Агент сам решит, читать ли код.
          </p>
        </div>
        <Textarea
          rows={5}
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Например: добавь Google OAuth"
        />
        <Button
          onClick={() => task.trim() && createMut.mutate(task.trim())}
          disabled={!task.trim() || createMut.isPending}
        >
          {createMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Отправить
        </Button>
      </div>
    </div>
  );
}

// === Session view ===

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

  const isRunning =
    session?.status === "planning" || session?.status === "executing";

  const stream = useSessionStream(isRunning ? sessionId : null);

  useEffect(() => {
    if (stream.events.length === 0) return;
    const last = stream.events[stream.events.length - 1];
    if (
      last.type === "done" ||
      last.type === "error" ||
      last.type === "assistant"
    ) {
      qc.invalidateQueries({ queryKey: ["codeai-session", sessionId] });
      qc.invalidateQueries({ queryKey: ["codeai-messages", sessionId] });
      qc.invalidateQueries({ queryKey: ["codeai-sessions", projectId] });
    }
  }, [stream.events, qc, sessionId, projectId]);

  const cancelMut = useMutation({
    mutationFn: () => codeaiApi.cancelSession(sessionId),
    onSuccess: () => {
      toast.message("Сессия отменена");
      qc.invalidateQueries({ queryKey: ["codeai-session", sessionId] });
    },
  });

  const sendMut = useMutation({
    mutationFn: (content: string) => codeaiApi.sendMessage(sessionId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["codeai-session", sessionId] });
      qc.invalidateQueries({ queryKey: ["codeai-messages", sessionId] });
    },
    onError: () => toast.error("Не удалось отправить сообщение"),
  });

  const blocks = useMemo(
    () =>
      buildBlocks(messages ?? [], stream.events as StreamEvent[], session ?? null),
    [messages, stream.events, session],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [blocks]);

  const [input, setInput] = useState("");

  if (!session) {
    return <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>;
  }

  const send = () => {
    const text = input.trim();
    if (!text || isRunning) return;
    sendMut.mutate(text);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-6">
        {blocks.map((b) => (
          <BlockView key={b.key} block={b} />
        ))}

        {session.status === "error" && !isRunning && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <div className="flex items-center gap-2 font-semibold">
              <XCircle className="h-4 w-4" /> Ошибка
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-background p-3">
        {isRunning && (
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              агент думает...
            </span>
            <button
              type="button"
              onClick={() => cancelMut.mutate()}
              className="text-xs text-red-600 hover:underline"
              disabled={cancelMut.isPending}
            >
              Остановить
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши задачу или вопрос..."
            disabled={isRunning || sendMut.isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="resize-none"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || isRunning || sendMut.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// === Block model ===

interface StreamEvent {
  type: string;
  message?: string;
  id?: string;
  tool?: string;
  input?: Record<string, unknown>;
  preview?: string;
  path?: string;
  action?: string;
  diff?: string;
  content?: string;
  pr_url?: string;
  branch_name?: string;
}

interface AgentBlock {
  key: string;
  kind: "user" | "assistant" | "tool" | "diff" | "done" | "thinking";
  // user / assistant
  text?: string;
  // tool
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResultPreview?: string;
  toolDone?: boolean;
  // diff
  path?: string;
  action?: string;
  diff?: string;
  // done
  prUrl?: string;
  branchName?: string;
}

function buildBlocks(
  messages: CodeAIMessage[],
  events: StreamEvent[],
  session: CodeAISession | null,
): AgentBlock[] {
  const blocks: AgentBlock[] = [];

  // Track in-flight tool calls so we can collapse tool_use + tool_result.
  const toolMap = new Map<string, number>(); // tool id -> blocks index

  for (const m of messages) {
    if (m.role === "user") {
      blocks.push({ key: `m-${m.id}`, kind: "user", text: m.content });
      continue;
    }
    if (m.message_type === "chat") {
      if (m.content.trim()) {
        blocks.push({ key: `m-${m.id}`, kind: "assistant", text: m.content });
      }
      continue;
    }
    if (m.message_type === "tool_use") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      const idx = blocks.push({
        key: `m-${m.id}`,
        kind: "tool",
        toolName: (meta.tool as string) ?? "",
        toolInput: (meta.input as Record<string, unknown>) ?? {},
        toolDone: false,
      }) - 1;
      if (typeof meta.id === "string" && meta.id) {
        toolMap.set(meta.id, idx);
      }
      continue;
    }
    if (m.message_type === "tool_result") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      const id = (meta.id as string) ?? "";
      const idx = id ? toolMap.get(id) : undefined;
      if (idx !== undefined) {
        const b = blocks[idx];
        b.toolDone = true;
        b.toolResultPreview = m.content.split("\n").slice(0, 5).join("\n");
      } else {
        blocks.push({
          key: `m-${m.id}`,
          kind: "tool",
          toolName: (meta.tool as string) ?? "",
          toolDone: true,
          toolResultPreview: m.content.split("\n").slice(0, 5).join("\n"),
        });
      }
      continue;
    }
    if (m.message_type === "diff") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      blocks.push({
        key: `m-${m.id}`,
        kind: "diff",
        path: (meta.path as string) ?? "",
        action: (meta.action as string) ?? "modify",
        diff: m.content,
      });
      continue;
    }
    // status / plan messages — skip
  }

  // Overlay live stream events (events not yet persisted).
  const streamToolMap = new Map<string, number>();
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === "tool_use") {
      const idx = blocks.push({
        key: `e-${i}`,
        kind: "tool",
        toolName: e.tool,
        toolInput: e.input,
        toolDone: false,
      }) - 1;
      if (e.id) streamToolMap.set(e.id, idx);
      continue;
    }
    if (e.type === "tool_result") {
      const idx = e.id ? streamToolMap.get(e.id) : undefined;
      if (idx !== undefined) {
        const b = blocks[idx];
        b.toolDone = true;
        b.toolResultPreview = e.preview ?? "";
      } else {
        blocks.push({
          key: `e-${i}`,
          kind: "tool",
          toolName: e.tool,
          toolDone: true,
          toolResultPreview: e.preview ?? "",
        });
      }
      continue;
    }
    if (e.type === "diff") {
      blocks.push({
        key: `e-${i}`,
        kind: "diff",
        path: e.path,
        action: e.action,
        diff: e.diff,
      });
      continue;
    }
    if (e.type === "assistant") {
      blocks.push({ key: `e-${i}`, kind: "assistant", text: e.content });
      continue;
    }
    // status events: not rendered (the input area shows "агент думает...")
  }

  // PR success block.
  if (session?.status === "done" && session.pr_url) {
    blocks.push({
      key: "done",
      kind: "done",
      prUrl: session.pr_url,
      branchName: session.branch_name ?? undefined,
    });
  }

  return blocks;
}

// === Block views ===

function BlockView({ block }: { block: AgentBlock }) {
  switch (block.kind) {
    case "user":
      return <UserBubble text={block.text ?? ""} />;
    case "assistant":
      return <AssistantText text={block.text ?? ""} />;
    case "tool":
      return (
        <ToolBlock
          name={block.toolName ?? ""}
          input={block.toolInput ?? {}}
          done={block.toolDone ?? false}
          preview={block.toolResultPreview}
        />
      );
    case "diff":
      return (
        <DiffBlock
          path={block.path ?? ""}
          action={block.action ?? "modify"}
          diff={block.diff ?? ""}
        />
      );
    case "done":
      return (
        <DoneBlock
          prUrl={block.prUrl ?? ""}
          branchName={block.branchName}
        />
      );
    default:
      return null;
  }
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
        {text}
      </div>
    </div>
  );
}

function AssistantText({ text }: { text: string }) {
  return (
    <div className="max-w-[85%] whitespace-pre-wrap text-sm leading-6">
      {text}
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

function ToolBlock({
  name,
  input,
  done,
  preview,
}: {
  name: string;
  input: Record<string, unknown>;
  done: boolean;
  preview?: string;
}) {
  const subtitle = useMemo(() => {
    if (typeof input.path === "string") return input.path;
    if (typeof input.branch_name === "string") return input.branch_name;
    return Object.keys(input).length > 0 ? JSON.stringify(input) : "";
  }, [input]);

  return (
    <Collapsible
      defaultOpen={false}
      header={
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs font-medium">{name}</span>
          {subtitle && (
            <span className="truncate font-mono text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
          <span className="ml-auto">
            {done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
            )}
          </span>
        </div>
      }
    >
      <div className="space-y-2 p-3 text-xs">
        {Object.keys(input).length > 0 && (
          <pre className="overflow-auto rounded bg-muted p-2 font-mono">
            {JSON.stringify(input, null, 2)}
          </pre>
        )}
        {done && preview && (
          <div>
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">
              Результат
            </div>
            <pre className="overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono">
              {preview}
            </pre>
          </div>
        )}
      </div>
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
      <pre className="max-h-96 overflow-auto font-mono text-xs leading-5">
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
              {line || " "}
            </div>
          );
        })}
      </pre>
    </Collapsible>
  );
}

function DoneBlock({
  prUrl,
  branchName,
}: {
  prUrl: string;
  branchName?: string;
}) {
  return (
    <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
      <div className="flex items-center gap-2 font-semibold">
        <CheckCircle2 className="h-5 w-5" /> PR создан
      </div>
      {branchName && (
        <div className="mt-1 font-mono text-xs text-green-800">
          {branchName}
        </div>
      )}
      <a
        href={prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 underline"
      >
        Открыть PR <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
