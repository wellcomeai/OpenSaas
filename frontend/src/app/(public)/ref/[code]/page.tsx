"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ReferralLandingPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code;

  useEffect(() => {
    if (!code) return;
    // 30 дней
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `referral_code=${code}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }, [code]);

  return (
    <main className="container py-24">
      <div className="mx-auto max-w-xl rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Реферальное приглашение
        </div>
        <h1 className="mt-3 text-3xl font-bold">
          Вас пригласили в OpenSaaS
        </h1>
        <p className="mt-3 text-muted-foreground">
          Зарегистрируйтесь по коду <span className="font-mono font-medium">{code}</span> и получите 3 дня бесплатного триала.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/register">
            <Button className="w-full" size="lg">
              Зарегистрироваться
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => router.push("/")}
          >
            На главную
          </Button>
        </div>

        <div className="mt-6 text-xs text-muted-foreground">
          Код сохранён в браузере на 30 дней.
        </div>
      </div>
    </main>
  );
}
