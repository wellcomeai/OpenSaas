"use client";

import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode,
  Loader2,
  Plus,
  Send,
  Terminal,
  X,
} from "lucide-react";

import { codeaiApi } from "@/api/codeai";
import { cn } from "@/lib/utils";
import { useSessionStream } from "@/hooks/useSessionStream";
import type {
  CodeAIMessage,
  CodeAIProject,
  CodeAISession,
  CodeAISessionStatus,
} from "@/types/codeai";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSessionTitle(task: string): string {
  const words = task.trim().split(/\s+/);
  return words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : "");
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "сегодня";
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`\n]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={i}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

function MarkdownContent({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = text.split("\n");
    const result: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Fenced code block
      if (line.startsWith("```")) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        result.push(
          <pre
            key={`cb-${i}`}
            className="my-1.5 overflow-auto rounded-lg bg-zinc-950 px-3 py-2.5 font-mono text-xs leading-5 text-zinc-100"
          >
            <code>{codeLines.join("\n")}</code>
          </pre>,
        );
        i++;
        continue;
      }

      // Heading
      if (line.startsWith("### ")) {
        result.push(
          <p key={`h-${i}`} className="font-semibold">
            {renderInline(line.slice(4))}
          </p>,
        );
        i++;
        continue;
      }
      if (line.startsWith("## ") || line.startsWith("# ")) {
        const depth = line.startsWith("## ") ? 2 : 1;
        result.push(
          <p
            key={`h-${i}`}
            className={cn("font-bold", depth === 1 ? "text-base" : "text-sm")}
          >
            {renderInline(line.slice(depth + 1))}
          </p>,
        );
        i++;
        continue;
      }

      // List block
      if (line.match(/^[-*] /) || line.match(/^\d+\. /)) {
        const items: string[] = [];
        const ordered = /^\d+\. /.test(line);
        while (
          i < lines.length &&
          (lines[i].match(/^[-*] /) || lines[i].match(/^\d+\. /))
        ) {
          items.push(lines[i].replace(/^[-*] /, "").replace(/^\d+\. /, ""));
          i++;
        }
        const Tag = ordered ? "ol" : "ul";
        result.push(
          <Tag
            key={`list-${i}`}
            className={cn("pl-4 space-y-0.5", ordered ? "list-decimal" : "list-disc")}
          >
            {items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </Tag>,
        );
        continue;
      }

      // Empty line
      if (line.trim() === "") {
        result.push(<div key={`br-${i}`} className="h-1.5" />);
        i++;
        continue;
      }

      // Paragraph
      result.push(
        <p key={`p-${i}`}>{renderInline(line)}</p>,
      );
      i++;
    }

    return result;
  }, [text]);

  return (
    <div className="space-y-0.5 text-sm leading-relaxed">{blocks}</div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CodeAISessionStatus }) {
  const map: Record<CodeAISessionStatus, { label: string; cls: string }> = {
    idle: { label: "idle", cls: "bg-muted text-muted-foreground" },
    planning: { label: "думает", cls: "bg-blue-100 text-blue-700" },
    awaiting_confirmation: { label: "ждёт", cls: "bg-blue-100 text-blue-700" },
    executing: { label: "работает", cls: "bg-blue-100 text-blue-700" },
    done: { label: "готово", cls: "bg-green-100 text-green-700" },
    error: { label: "ошибка", cls: "bg-red-100 text-red-700" },
  };
  const v = map[status] ?? map.idle;
  return (
    <span
      className={cn(
        "rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        v.cls,
      )}
    >
      {v.label}
    </span>
  );
}

// ─── Model selector ───────────────────────────────────────────────────────────

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["codeai-settings"] }),
    onError: () => toast.error("Не удалось сменить модель"),
  });

  const opts = useMemo(
    () => (models ? [...models].sort((a, b) => a.id.localeCompare(b.id)) : []),
    [models],
  );

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Модель
      </label>
      <select
        className="w-full rounded border bg-background px-2 py-1.5 text-[11px] font-mono text-foreground"
        value={settings?.model ?? ""}
        onChange={(e) => updateMut.mutate(e.target.value)}
        disabled={!settings || updateMut.isPending}
      >
        {!settings && <option>...</option>}
        {settings && !opts.find((m) => m.id === settings.model) && (
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

// ─── Left panel ───────────────────────────────────────────────────────────────

function SessionItem({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: CodeAISession;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn(
        "relative flex cursor-pointer items-start gap-1.5 rounded-lg px-2.5 py-2 transition-colors",
        active
          ? "border-l-2 border-primary bg-primary/8 pl-2"
          : "border-l-2 border-transparent hover:bg-muted/60",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-xs font-medium leading-4",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {getSessionTitle(session.task)}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <StatusBadge status={session.status} />
          <span className="text-[10px] text-muted-foreground">
            {relativeDate(session.created_at)}
          </span>
        </div>
      </div>
      {hovered && (
        <button
          type="button"
          title="Удалить"
          className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function LeftPanel({
  projectId,
  project,
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  collapsed,
  onToggleCollapse,
}: {
  projectId: string;
  project: CodeAIProject | undefined;
  sessions: CodeAISession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (id: string) => codeaiApi.deleteSession(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["codeai-sessions", projectId] });
      if (activeSessionId === id) onNew();
    },
    onError: () => toast.error("Не удалось удалить сессию"),
  });

  return (
    <aside
      className={cn(
        "flex flex-col border-r transition-all duration-200",
        collapsed ? "w-12" : "w-[220px]",
      )}
      style={{ background: "#fafafa", borderColor: "rgba(0,0,0,0.06)" }}
    >
      {/* Header row */}
      <div
        className="flex h-11 shrink-0 items-center justify-between px-2"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        {!collapsed && (
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {project?.repo_full_name ?? "…"}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {collapsed ? (
        /* Collapsed: just a new-task icon */
        <div className="flex flex-col items-center gap-1 p-1.5 pt-2">
          <button
            type="button"
            title="Новая задача (⌘K)"
            onClick={onNew}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          {/* New task button */}
          <div className="p-2.5 pb-2">
            <button
              type="button"
              onClick={onNew}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Новая задача
            </button>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto px-1.5 py-1">
            {sessions.length === 0 ? (
              <p className="mt-4 px-3 text-center text-xs text-muted-foreground">
                Создай первую задачу
              </p>
            ) : (
              sessions.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  active={s.id === activeSessionId}
                  onSelect={() => onSelect(s.id)}
                  onDelete={() => deleteMut.mutate(s.id)}
                />
              ))
            )}
          </div>

          {/* Model selector at bottom */}
          <div
            className="shrink-0 p-3"
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
          >
            <ModelSelector />
          </div>
        </>
      )}
    </aside>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Копировать"
      className="rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── Block model ──────────────────────────────────────────────────────────────

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
  kind: "user" | "assistant" | "tool" | "diff" | "done";
  text?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResultPreview?: string;
  toolDone?: boolean;
  path?: string;
  action?: string;
  diff?: string;
  prUrl?: string;
  branchName?: string;
}

function buildBlocks(
  messages: CodeAIMessage[],
  events: StreamEvent[],
  session: CodeAISession | null,
): AgentBlock[] {
  const blocks: AgentBlock[] = [];
  const toolMap = new Map<string, number>();

  for (const m of messages) {
    if (m.role === "user") {
      blocks.push({ key: `m-${m.id}`, kind: "user", text: m.content });
      continue;
    }
    if (m.message_type === "chat" && m.content.trim()) {
      blocks.push({ key: `m-${m.id}`, kind: "assistant", text: m.content });
      continue;
    }
    if (m.message_type === "tool_use") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      const idx =
        blocks.push({
          key: `m-${m.id}`,
          kind: "tool",
          toolName: (meta.tool as string) ?? "",
          toolInput: (meta.input as Record<string, unknown>) ?? {},
          toolDone: false,
        }) - 1;
      if (typeof meta.id === "string" && meta.id) toolMap.set(meta.id, idx);
      continue;
    }
    if (m.message_type === "tool_result") {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      const id = (meta.id as string) ?? "";
      const idx = id ? toolMap.get(id) : undefined;
      if (idx !== undefined) {
        blocks[idx].toolDone = true;
        blocks[idx].toolResultPreview = m.content
          .split("\n")
          .slice(0, 5)
          .join("\n");
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
  }

  const streamToolMap = new Map<string, number>();
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === "tool_use") {
      const idx =
        blocks.push({
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
        blocks[idx].toolDone = true;
        blocks[idx].toolResultPreview = e.preview ?? "";
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
  }

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

// ─── Block views ──────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="group relative max-w-[85%]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MarkdownContent text={text} />
      {hovered && (
        <div className="absolute -right-8 top-0">
          <CopyButton text={text} />
        </div>
      )}
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
    <div className="overflow-hidden rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/40"
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        <div className="min-w-0 flex-1">{header}</div>
      </button>
      {open && <div className="border-t bg-muted/10">{children}</div>}
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
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono font-medium">{name}</span>
          {subtitle && (
            <span className="truncate font-mono text-muted-foreground">
              {subtitle}
            </span>
          )}
          <span className="ml-auto">
            {done ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
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
          <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="truncate font-mono">{path}</span>
          <span className="shrink-0 rounded bg-muted/60 px-1 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
            {action}
          </span>
          <span className="ml-auto shrink-0">
            <span className="text-green-600">+{stats.add}</span>{" "}
            <span className="text-red-500">−{stats.del}</span>
          </span>
        </div>
      }
    >
      <pre className="max-h-96 overflow-auto font-mono text-xs leading-5">
        {diff.split("\n").map((line, i) => {
          let cls = "block px-3";
          if (line.startsWith("+++") || line.startsWith("---"))
            cls = "block px-3 text-muted-foreground";
          else if (line.startsWith("+"))
            cls = "block px-3 bg-green-50 text-green-900";
          else if (line.startsWith("-"))
            cls = "block px-3 bg-red-50 text-red-900";
          else if (line.startsWith("@@"))
            cls = "block px-3 bg-muted/60 text-muted-foreground";
          return (
            <span key={i} className={cls}>
              {line || " "}
            </span>
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
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
      <div className="flex items-center gap-2 font-semibold">
        <Check className="h-4 w-4" /> PR создан успешно
      </div>
      {branchName && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-green-700">Ветка:</span>
          <span className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs text-green-800">
            {branchName}
          </span>
        </div>
      )}
      <a
        href={prUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
      >
        Открыть PR <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function BlockView({ block }: { block: AgentBlock }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      {block.kind === "user" && <UserBubble text={block.text ?? ""} />}
      {block.kind === "assistant" && (
        <AssistantBubble text={block.text ?? ""} />
      )}
      {block.kind === "tool" && (
        <ToolBlock
          name={block.toolName ?? ""}
          input={block.toolInput ?? {}}
          done={block.toolDone ?? false}
          preview={block.toolResultPreview}
        />
      )}
      {block.kind === "diff" && (
        <DiffBlock
          path={block.path ?? ""}
          action={block.action ?? "modify"}
          diff={block.diff ?? ""}
        />
      )}
      {block.kind === "done" && (
        <DoneBlock prUrl={block.prUrl ?? ""} branchName={block.branchName} />
      )}
    </motion.div>
  );
}

// ─── Session view ─────────────────────────────────────────────────────────────

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
      buildBlocks(
        messages ?? [],
        stream.events as StreamEvent[],
        session ?? null,
      ),
    [messages, stream.events, session],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevBlockCount = useRef(0);
  useEffect(() => {
    if (blocks.length !== prevBlockCount.current) {
      prevBlockCount.current = blocks.length;
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [blocks]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, [sessionId]);

  const [input, setInput] = useState("");

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isRunning || sendMut.isPending) return;
    sendMut.mutate(text);
    setInput("");
  }, [input, isRunning, sendMut]);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-5"
      >
        <div className="mx-auto max-w-2xl space-y-4 pb-4">
          <AnimatePresence initial={false}>
            {blocks.map((b) => (
              <BlockView key={b.key} block={b} />
            ))}
          </AnimatePresence>

          {/* Typing indicator while agent is running and no live events yet */}
          {isRunning && stream.events.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <TypingIndicator />
              <span>агент думает...</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div
        className="shrink-0 px-6 pb-5 pt-3"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="mx-auto max-w-2xl">
          {isRunning && (
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                агент работает...
              </span>
              <button
                type="button"
                onClick={() => cancelMut.mutate()}
                disabled={cancelMut.isPending}
                className="text-red-500 hover:underline"
              >
                Остановить
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Напиши задачу или вопрос… (Enter — отправить, Shift+Enter — новая строка)"
              disabled={isRunning || sendMut.isPending}
              className="flex-1 resize-none overflow-hidden rounded-xl border bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              style={{ minHeight: "44px" }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || isRunning || sendMut.isPending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sendMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New task view ────────────────────────────────────────────────────────────

function NewTaskView({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: (sessionId: string) => void;
}) {
  const qc = useQueryClient();
  const [task, setTask] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const createMut = useMutation({
    mutationFn: (text: string) =>
      codeaiApi.createSession({ project_id: projectId, task: text }),
    onSuccess: (s) => {
      onCreated(s.id);
      qc.invalidateQueries({ queryKey: ["codeai-sessions", projectId] });
    },
    onError: () => toast.error("Не удалось создать сессию"),
  });

  const submit = () => {
    const text = task.trim();
    if (!text || createMut.isPending) return;
    createMut.mutate(text);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-xl space-y-4"
      >
        <div>
          <h2 className="text-lg font-semibold">Новая задача</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Задай вопрос, опиши баг или фичу — агент решит, нужно ли читать
            код.
          </p>
        </div>
        <textarea
          ref={textareaRef}
          rows={4}
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Например: добавь авторизацию через Google OAuth"
          className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!task.trim() || createMut.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Отправить
        </button>
        <p className="text-xs text-muted-foreground">
          Enter — отправить · Shift+Enter — новая строка · ⌘K — новая задача
        </p>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CodeAIProjectChatPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Auto-select most recent session
  useEffect(() => {
    if (!activeSessionId && sessions && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Cmd/Ctrl+K → new task
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setActiveSessionId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="-m-6 flex h-screen overflow-hidden">
      <LeftPanel
        projectId={projectId}
        project={project}
        sessions={sessions ?? []}
        activeSessionId={activeSessionId}
        onSelect={setActiveSessionId}
        onNew={() => setActiveSessionId(null)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <section className="flex flex-1 flex-col overflow-hidden bg-background">
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
