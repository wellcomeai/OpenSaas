"use client";

import { useEffect, useState } from "react";

import { tokenStorage } from "@/api/client";

export interface SessionStreamEvent {
  type: string;
  message?: string;
  plan?: unknown;
  pr_url?: string;
  branch_name?: string;
}

/**
 * Подписка на SSE-стрим сессии. EventSource не поддерживает custom
 * заголовки, поэтому передаём токен через query string. Backend
 * проверяет JWT через стандартный `Authorization` — поэтому используем
 * fetch с ReadableStream вместо EventSource.
 */
export function useSessionStream(sessionId: string | null) {
  const [events, setEvents] = useState<SessionStreamEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const ctrl = new AbortController();
    const token = tokenStorage.access;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const url = `${apiUrl}/api/v1/codeai/sessions/${sessionId}/stream`;

    (async () => {
      try {
        const r = await fetch(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            Accept: "text/event-stream",
          },
          signal: ctrl.signal,
        });
        if (!r.ok || !r.body) return;
        setConnected(true);

        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let sepIdx;
          while ((sepIdx = buf.indexOf("\n\n")) !== -1) {
            const raw = buf.slice(0, sepIdx);
            buf = buf.slice(sepIdx + 2);

            const dataLine = raw
              .split("\n")
              .find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            try {
              const parsed = JSON.parse(dataLine.slice(5).trim());
              setEvents((prev) => [...prev, parsed]);
              if (parsed.type === "done" || parsed.type === "error") {
                ctrl.abort();
                return;
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // aborted / network error
      } finally {
        setConnected(false);
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [sessionId]);

  return { events, connected };
}
