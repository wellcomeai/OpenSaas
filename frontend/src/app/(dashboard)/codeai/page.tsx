"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Github, Plus, Trash2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { codeaiApi } from "@/api/codeai";

export default function CodeAIProjectsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const params = useSearchParams();
  const installationIdFromUrl = params.get("installation_id");
  const justInstalled = params.get("installed") === "true";
  const installError = params.get("install_error");

  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["codeai-projects"],
    queryFn: () => codeaiApi.listProjects(),
  });

  const { data: installUrl } = useQuery({
    queryKey: ["codeai-github-install-url"],
    queryFn: () => codeaiApi.getGithubConnectUrl(),
    staleTime: 60 * 60 * 1000,
  });

  // После установки GitHub App юзер возвращается на /codeai?installed=true&installation_id=...
  useEffect(() => {
    if (justInstalled) {
      toast.success("GitHub App установлен");
      qc.invalidateQueries({ queryKey: ["codeai-repos"] });
      setPickerOpen(true);
    } else if (installationIdFromUrl) {
      setPickerOpen(true);
    }
  }, [justInstalled, installationIdFromUrl, qc]);

  useEffect(() => {
    if (installError) {
      toast.error("Не удалось подтвердить установку GitHub App");
      router.replace("/codeai");
    }
  }, [installError, router]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => codeaiApi.deleteProject(id),
    onSuccess: () => {
      toast.success("Проект удалён");
      qc.invalidateQueries({ queryKey: ["codeai-projects"] });
    },
  });

  const hasInstallationUrl = Boolean(installUrl);

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">CodeAI</h1>
        <p className="text-sm text-muted-foreground">
          AI-агент для работы с GitHub репозиториями.
        </p>
      </div>

      {(!projects || projects.length === 0) && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Github className="h-10 w-10 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">Подключите GitHub</h2>
              <p className="text-sm text-muted-foreground">
                Установите GitHub App, чтобы CodeAI мог читать ваш код и
                создавать pull-реквесты.
              </p>
            </div>
            {hasInstallationUrl ? (
              <a
                href={installUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>
                  <Github className="mr-2 h-4 w-4" />
                  Установить GitHub App
                </Button>
              </a>
            ) : (
              <p className="text-xs text-destructive">
                GitHub App не настроен на сервере (GITHUB_APP_INSTALLATION_URL)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {projects && projects.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Мои репозитории</CardTitle>
            {hasInstallationUrl && (
              <a
                href={installUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить
                </Button>
              </a>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-sm font-medium">
                    {p.repo_full_name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/codeai/${p.id}`}>
                    <Button size="sm">
                      Открыть
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Удалить проект ${p.repo_full_name}?`)) {
                        deleteMut.mutate(p.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <RepoPickerDialog
        open={pickerOpen}
        onOpenChange={(v) => {
          setPickerOpen(v);
          if (!v && installationIdFromUrl) {
            router.replace("/codeai");
          }
        }}
        installationId={installationIdFromUrl}
      />
    </>
  );
}

function RepoPickerDialog({
  open,
  onOpenChange,
  installationId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  installationId: string | null;
}) {
  const qc = useQueryClient();
  const { data: repos, isLoading } = useQuery({
    queryKey: ["codeai-repos", installationId],
    queryFn: () => codeaiApi.listRepos(),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: (full_name: string) =>
      codeaiApi.createProject({
        repo_full_name: full_name,
        github_installation_id: installationId ?? "",
      }),
    onSuccess: () => {
      toast.success("Проект создан");
      qc.invalidateQueries({ queryKey: ["codeai-projects"] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Не удалось создать проект");
    },
  });

  if (!installationId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выберите репозиторий</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        ) : !repos || repos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Нет доступных репозиториев.
          </p>
        ) : (
          <div className="max-h-[400px] space-y-1 overflow-y-auto">
            {repos.map((r) => (
              <button
                key={r.full_name}
                type="button"
                disabled={createMut.isPending}
                onClick={() => createMut.mutate(r.full_name)}
                className="flex w-full items-start justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted"
              >
                <div>
                  <div className="font-mono font-medium">{r.full_name}</div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                </div>
                <Plus className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
