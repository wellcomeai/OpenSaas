"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Film, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { animationsApi } from "@/api/animations";
import type {
  AnimationAspect,
  AnimationJob,
  AnimationJobStatus,
} from "@/types/animations";

const ASPECTS: { value: AnimationAspect; label: string; hint: string }[] = [
  { value: "9:16", label: "9:16", hint: "Reels / Shorts" },
  { value: "1:1", label: "1:1", hint: "Квадрат" },
  { value: "16:9", label: "16:9", hint: "Широкий" },
];

const FPS_OPTIONS = [24, 30];
const DURATIONS = [3, 6, 10, 15];

const STATUS_LABELS: Record<AnimationJobStatus, string> = {
  queued: "В очереди…",
  generating_html: "Генерация сцены (LLM)…",
  rendering: "Рендер кадров…",
  encoding: "Сборка mp4…",
  done: "Готово",
  error: "Ошибка",
};

const ACTIVE_STATUSES: AnimationJobStatus[] = [
  "queued",
  "generating_html",
  "rendering",
  "encoding",
];

export default function AnimationsPage() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(6);
  const [fps, setFps] = useState(30);
  const [aspect, setAspect] = useState<AnimationAspect>("9:16");

  const [jobId, setJobId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const lastVideoUrl = useRef<string | null>(null);

  const generateMut = useMutation({
    mutationFn: () =>
      animationsApi.generate({ prompt: prompt.trim(), duration, fps, aspect }),
    onSuccess: (res) => {
      setVideoUrl(null);
      setJobId(res.job_id);
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Не удалось запустить генерацию";
      toast.error(typeof detail === "string" ? detail : "Ошибка запроса");
    },
  });

  // Опрос статуса задачи каждые 2 сек, пока она активна.
  const { data: job } = useQuery<AnimationJob>({
    queryKey: ["animation-job", jobId],
    queryFn: () => animationsApi.getJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s && ACTIVE_STATUSES.includes(s) ? 2000 : false;
    },
  });

  // Когда готово — подтягиваем blob с авторизацией и показываем видео.
  useEffect(() => {
    if (job?.status === "done" && job.download_url && !videoUrl) {
      animationsApi
        .downloadBlobUrl(job.job_id)
        .then((url) => {
          if (lastVideoUrl.current) URL.revokeObjectURL(lastVideoUrl.current);
          lastVideoUrl.current = url;
          setVideoUrl(url);
        })
        .catch(() => toast.error("Не удалось загрузить видео"));
    }
    if (job?.status === "error") {
      toast.error(job.error_message ?? "Генерация завершилась ошибкой");
    }
  }, [job, videoUrl]);

  // Чистим object URL при размонтировании.
  useEffect(
    () => () => {
      if (lastVideoUrl.current) URL.revokeObjectURL(lastVideoUrl.current);
    },
    [],
  );

  const isBusy =
    generateMut.isPending ||
    (!!job && ACTIVE_STATUSES.includes(job.status)) ||
    (!!jobId && !job);

  const progressPct = Math.round((job?.progress ?? 0) * 100);

  function handleDownload() {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `animation-${job?.job_id ?? "video"}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Film className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Анимации</h1>
          <p className="text-sm text-muted-foreground">
            Опишите анимацию текстом — получите готовый mp4. Один запрос —
            одно видео.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Описание анимации</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Textarea
            placeholder="Например: Анимированный логотип Voicyfy — текст выезжает снизу, появляется звуковая волна, тёмный фон"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            rows={4}
            disabled={isBusy}
          />

          {/* Формат */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Формат</p>
            <div className="flex flex-wrap gap-2">
              {ASPECTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  disabled={isBusy}
                  onClick={() => setAspect(a.value)}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-left text-sm transition-colors disabled:opacity-50",
                    aspect === a.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-muted",
                  )}
                >
                  <div className="font-semibold">{a.label}</div>
                  <div className="text-xs text-muted-foreground">{a.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Длительность + FPS */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Длительность, сек</p>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "h-9 w-12 rounded-lg border text-sm transition-colors disabled:opacity-50",
                      duration === d
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">FPS</p>
              <div className="flex gap-2">
                {FPS_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setFps(f)}
                    className={cn(
                      "h-9 w-14 rounded-lg border text-sm transition-colors disabled:opacity-50",
                      fps === f
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input hover:bg-muted",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={() => generateMut.mutate()}
            disabled={isBusy || prompt.trim().length === 0}
            className="w-full sm:w-auto"
          >
            {isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isBusy ? "Генерация…" : "Генерировать"}
          </Button>
        </CardContent>
      </Card>

      {/* Прогресс / результат */}
      {(isBusy || job) && (
        <Card>
          <CardHeader>
            <CardTitle>Результат</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job?.status !== "done" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {job ? STATUS_LABELS[job.status] : "Запуск…"}
                  </span>
                  {job?.status === "rendering" && (
                    <span className="tabular-nums">{progressPct}%</span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-all duration-500",
                      job?.status === "error" && "bg-destructive",
                    )}
                    style={{
                      width:
                        job?.status === "rendering"
                          ? `${progressPct}%`
                          : job?.status === "error"
                            ? "100%"
                            : job
                              ? "100%"
                              : "10%",
                    }}
                  />
                </div>
              </div>
            )}

            {job?.status === "error" && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {job.error_message ?? "Неизвестная ошибка"}
              </p>
            )}

            {job?.status === "done" && videoUrl && (
              <div className="space-y-4">
                <video
                  src={videoUrl}
                  controls
                  loop
                  className="mx-auto max-h-[70vh] rounded-lg border bg-black"
                />
                <Button onClick={handleDownload} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Скачать mp4
                </Button>
              </div>
            )}

            {job?.status === "done" && !videoUrl && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка видео…
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
