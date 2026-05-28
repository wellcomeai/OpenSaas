"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileCode,
  GitBranch,
  Loader2,
  Plus,
  Send,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { codeaiApi } from "@/api/codeai";
import { cn, formatDateTime } from "@/lib/utils";
import { useSessionStream } from "@/hooks/useSessionStream";
import type {
  CodeAIMessage,
  CodeAIPlan,
  CodeAISession,
  CodeAISessionStatus,
} from "@/types/codeai";

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

  // Авто-выбор последней сессии
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
    <div className="-m-6 grid h-[calc(100vh-3.5rem)] grid-cols-[220px_1fr_280px]">
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
          <div className="mt-1 flex items-center gap-2">
            {project?.is_indexed ? (
              <Badge variant="success">indexed</Badge>
            ) : (
              <Badge variant="warning">not indexed</Badge>
            )}
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
            disabled={!project?.is_indexed}
          />
        )}
      </section>

      {/* Right panel */}
      <aside className="overflow-y-auto border-l bg-muted/20 p-4">
        <RightPanel sessionId={activeSessionId} />
      </aside>
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
  disabled,
}: {
  task: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  disabled: boolean;
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
        {disabled && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            Репозиторий ещё не проиндексирован. Запустите индексацию на
            странице CodeAI.
          </div>
        )}
        <Textarea
          rows={5}
          value={task}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Например: Добавь Google OAuth авторизацию"
        />
        <Button
          onClick={onSubmit}
          disabled={!task.trim() || isPending || disabled}
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

  // Invalidate when stream gets a terminal event
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

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, stream.events]);

  if (!session) {
    return <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Timeline */}
      <div className="flex items-center gap-4 border-b p-4 text-xs">
        <TimelineStep label="Анализ" active={session.status !== "idle"} done={session.status !== "idle" && session.status !== "planning"} />
        <TimelineStep label="План" active={session.status === "planning"} done={["awaiting_confirmation", "executing", "done"].includes(session.status)} />
        <TimelineStep label="Подтверждение" active={session.status === "awaiting_confirmation"} done={["executing", "done"].includes(session.status)} />
        <TimelineStep label="Выполнение" active={session.status === "executing"} done={session.status === "done"} />
        <TimelineStep label="Готово" active={false} done={session.status === "done"} />
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
        {/* user task */}
        <UserBubble text={session.task} />

        {messages?.map((m) => (
          <MessageItem key={m.id} message={m} />
        ))}

        {session.status === "awaiting_confirmation" && session.plan && (
          <PlanCard
            plan={session.plan}
            onConfirm={() => confirmMut.mutate()}
            onCancel={() => cancelMut.mutate()}
            isPending={confirmMut.isPending || cancelMut.isPending}
          />
        )}

        {(session.status === "planning" || session.status === "executing") &&
          stream.events.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                Live feed
              </div>
              <ul className="space-y-1 text-sm">
                {stream.events.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                    <span>{e.message ?? e.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {session.status === "done" && session.pr_url && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              Pull Request создан
            </div>
            <a
              href={session.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 underline"
            >
              {session.pr_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

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

function MessageItem({ message }: { message: CodeAIMessage }) {
  if (message.role === "user") {
    return <UserBubble text={message.content} />;
  }

  if (message.message_type === "plan") {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Анализ
        </div>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  }

  if (message.message_type === "status") {
    return (
      <div className="text-xs text-muted-foreground">• {message.content}</div>
    );
  }

  return (
    <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm">
      {message.content}
    </div>
  );
}

function PlanCard({
  plan,
  onConfirm,
  onCancel,
  isPending,
}: {
  plan: CodeAIPlan;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📋 План изменений</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {plan.reasoning && (
          <p className="text-muted-foreground">{plan.reasoning}</p>
        )}
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Файлы
          </div>
          <ul className="space-y-1.5">
            {plan.files_to_change.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <span className="font-mono">{f.path}</span>{" "}
                  <Badge variant="outline">{f.action}</Badge>
                  <p className="text-xs text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          <span className="font-mono">{plan.branch_name}</span>
        </div>
        <div className="flex gap-2 pt-2">
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
      </CardContent>
    </Card>
  );
}

function RightPanel({ sessionId }: { sessionId: string | null }) {
  const { data: session } = useQuery({
    queryKey: ["codeai-session", sessionId],
    queryFn: () => codeaiApi.getSession(sessionId as string),
    enabled: Boolean(sessionId),
    refetchInterval: 3000,
  });

  const files = useMemo(() => {
    if (!session?.plan) return [];
    return session.plan.files_to_change ?? [];
  }, [session]);

  if (!sessionId) {
    return (
      <div className="text-sm text-muted-foreground">
        Выберите сессию или создайте новую задачу.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase text-muted-foreground">
        Файлы в плане
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">План ещё не построен.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={i} className="rounded border p-2 text-sm">
              <div className="flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-xs">{f.path}</span>
              </div>
              <Badge variant="outline" className="mt-1">
                {f.action}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {session?.branch_name && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Ветка
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <GitBranch className="h-3 w-3" />
            {session.branch_name}
          </div>
        </div>
      )}

      {session?.pr_url && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Pull Request
          </div>
          <a
            href={session.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Открыть PR
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
