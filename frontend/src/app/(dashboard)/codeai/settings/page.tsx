"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { codeaiApi } from "@/api/codeai";
import { cn } from "@/lib/utils";
import type { CodeAIModel } from "@/types/codeai";

export default function CodeAISettingsPage() {
  const qc = useQueryClient();

  const { data: models } = useQuery({
    queryKey: ["codeai-models"],
    queryFn: () => codeaiApi.getAvailableModels(),
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["codeai-settings"],
    queryFn: () => codeaiApi.getSettings(),
  });

  const [planning, setPlanning] = useState<string>("");
  const [editing, setEditing] = useState<string>("");

  useEffect(() => {
    if (settings) {
      setPlanning(settings.planning_model);
      setEditing(settings.editing_model);
    }
  }, [settings]);

  const updateMut = useMutation({
    mutationFn: () =>
      codeaiApi.updateSettings({
        planning_model: planning,
        editing_model: editing,
      }),
    onSuccess: () => {
      toast.success("Настройки сохранены");
      qc.invalidateQueries({ queryKey: ["codeai-settings"] });
    },
  });

  const dirty =
    settings &&
    (planning !== settings.planning_model ||
      editing !== settings.editing_model);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link href="/codeai">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Настройки CodeAI</h1>
          <p className="text-sm text-muted-foreground">
            Выбор моделей OpenRouter для планирования и редактирования кода.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Модель для планирования</CardTitle>
          <p className="text-sm text-muted-foreground">
            Анализирует репозиторий и строит план изменений.
          </p>
        </CardHeader>
        <CardContent>
          <ModelPicker
            models={models}
            value={planning}
            onChange={setPlanning}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Модель для редактирования кода</CardTitle>
          <p className="text-sm text-muted-foreground">
            Генерирует изменения в файлах перед коммитом.
          </p>
        </CardHeader>
        <CardContent>
          <ModelPicker models={models} value={editing} onChange={setEditing} />
        </CardContent>
      </Card>

      <div>
        <Button
          onClick={() => updateMut.mutate()}
          disabled={!dirty || updateMut.isPending || isLoading}
        >
          Сохранить настройки
        </Button>
      </div>
    </>
  );
}

function ModelPicker({
  models,
  value,
  onChange,
}: {
  models: CodeAIModel[] | undefined;
  value: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!models) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return models.slice(0, 50);
    return models
      .filter(
        (m) =>
          m.id.toLowerCase().includes(needle) ||
          m.name.toLowerCase().includes(needle),
      )
      .slice(0, 50);
  }, [models, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск модели..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-md border p-1">
        {filtered.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">
            {models ? "Ничего не найдено" : "Загрузка моделей..."}
          </p>
        )}
        {filtered.map((m) => {
          const selected = m.id === value;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={cn(
                "flex w-full items-start justify-between gap-3 rounded p-2 text-left text-sm transition-colors",
                selected ? "bg-primary/10" : "hover:bg-muted",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-full border",
                      selected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground",
                    )}
                  />
                  <span className="font-mono text-sm">{m.id}</span>
                </div>
                {m.description && (
                  <p className="ml-5 mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {m.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <div>{formatContext(m.context_length)}</div>
                <div>{formatPricing(m.pricing.prompt)}/1M in</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatContext(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ctx`;
  if (n >= 1000) return `${Math.round(n / 1000)}k ctx`;
  return `${n} ctx`;
}

function formatPricing(p: string): string {
  const n = parseFloat(p);
  if (Number.isNaN(n) || n === 0) return "$0";
  // OpenRouter — цена за 1 token
  const per_million = n * 1_000_000;
  if (per_million < 0.01) return `$${per_million.toFixed(4)}`;
  return `$${per_million.toFixed(2)}`;
}
