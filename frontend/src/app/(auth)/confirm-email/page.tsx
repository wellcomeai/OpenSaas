"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { authApi } from "@/api/auth";

type State = "loading" | "success" | "error";

function ConfirmEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Не указан токен в URL.");
      return;
    }
    authApi
      .confirmEmail(token)
      .then(() => {
        setState("success");
        setTimeout(() => router.push("/dashboard"), 1500);
      })
      .catch((e) => {
        const err = e as AxiosError<{ detail?: string }>;
        setError(err.response?.data?.detail ?? "Ссылка недействительна или истекла.");
        setState("error");
      });
  }, [token, router]);

  return (
    <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">Подтверждаем email...</h1>
        </>
      )}
      {state === "success" && (
        <>
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <h1 className="mt-4 text-xl font-semibold">Email подтверждён</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Перенаправляем в Dashboard…
          </p>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Не удалось подтвердить</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push("/login")}
          >
            На страницу входа
          </Button>
        </>
      )}
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ConfirmEmailInner />
    </Suspense>
  );
}
