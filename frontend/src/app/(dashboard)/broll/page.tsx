"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Film, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiClient } from "@/api/client";
import { brollApi } from "@/api/broll";
import { formatDateTime } from "@/lib/utils";
import type { BrollJob, BrollStatus } from "@/types/broll";

const STATUS_META: Record<
  BrollStatus,
  { label: string; variant: "default" | "success" | "warning" | "destructive" }
> = {
  pending: { label: "В очереди", variant: "warning" },
  processing: { label: "Рендеринг", variant: "warning" },
  done: { label: "Готово", variant: "success" },
  error: { label: "Ошибка", variant: "destructive" },
};

export default function BrollPage() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["broll-jobs"],
    queryFn: () => brollApi.listJobs(),
    // Пока есть незавершённые джобы — опрашиваем каждые 2 секунды.
    refetchInterval: (query) => {
      const data = query.state.data as BrollJob[] | undefined;
      const active = data?.some(
        (j) => j.status === "pending" || j.status === "processing",
      );
      return active ? 2000 : false;
    },
  });

  const generateMut = useMutation({
    mutationFn: (p: string) => brollApi.generate(p),
    onSuccess: () => {
      setPrompt("");
      toast.success("Ролик создаётся");
      qc.invalidateQueries({ queryKey: ["broll-jobs"] });
    },
    onError: () => {
      toast.error("Не удалось создать ролик");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;
    generateMut.mutate(trimmed);
  };

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">B-roll</h1>
        <p className="text-sm text-muted-foreground">
          Опишите идею — и получите короткую фоновую анимацию (1080×1920, MP4).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Новый ролик</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Например: График биткоина"
              maxLength={500}
              disabled={generateMut.isPending}
            />
            <Button
              type="submit"
              disabled={generateMut.isPending || prompt.trim().length === 0}
            >
              {generateMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Film className="mr-2 h-4 w-4" />
              )}
              Создать ролик
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      )}

      {jobs && jobs.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Film className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Пока нет роликов. Создайте первый выше.
            </p>
          </CardContent>
        </Card>
      )}

      {jobs && jobs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <BrollJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </>
  );
}

function BrollJobCard({ job }: { job: BrollJob }) {
  const status = STATUS_META[job.status];

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{job.prompt}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(job.created_at)}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {job.scene && (
          <p className="text-xs text-muted-foreground">
            Сцена: <span className="font-mono">{job.scene}</span>
          </p>
        )}

        {(job.status === "pending" || job.status === "processing") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Генерация...
          </div>
        )}

        {job.status === "error" && (
          <p className="break-words text-sm text-destructive">
            {job.error || "Не удалось сгенерировать ролик"}
          </p>
        )}

        {job.status === "done" && <BrollVideo job={job} />}
      </CardContent>
    </Card>
  );
}

function BrollVideo({ job }: { job: BrollJob }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Эндпоинт /file защищён JWT, а <video src> не шлёт Authorization,
  // поэтому грузим файл как blob через apiClient и отдаём objectURL.
  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    apiClient
      .get(brollApi.fileUrl(job.id), { responseType: "blob" })
      .then((r) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(r.data as Blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!revoked) setFailed(true);
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [job.id]);

  if (failed) {
    return (
      <p className="text-sm text-destructive">Не удалось загрузить видео</p>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка видео...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <video
        src={url}
        controls
        playsInline
        className="aspect-[9/16] w-full rounded-lg bg-black"
      />
      <a href={url} download={`${job.id}.mp4`}>
        <Button variant="outline" size="sm" className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Скачать
        </Button>
      </a>
    </div>
  );
}
