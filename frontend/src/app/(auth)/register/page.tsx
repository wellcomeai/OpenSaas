"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

const schema = z
  .object({
    first_name: z.string().min(1, "Обязательное поле").max(100),
    last_name: z.string().min(1, "Обязательное поле").max(100),
    email: z.string().email("Введите корректный email"),
    password: z.string().min(8, "Минимум 8 символов"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Пароли не совпадают",
  });

type FormValues = z.infer<typeof schema>;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

interface PendingState {
  userId: string;
  email: string;
  devCode: string | null;
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [refCode, setRefCode] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingState | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    setRefCode(readCookie("referral_code"));
  }, []);

  async function onSubmit(values: FormValues) {
    try {
      const res = await registerUser(
        values.email,
        values.password,
        values.first_name,
        values.last_name,
        refCode ?? undefined,
      );
      if (res.pendingVerification) {
        setPending({
          userId: res.userId,
          email: values.email,
          devCode: res.devCode,
        });
      }
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>;
      toast.error(err.response?.data?.detail ?? "Не удалось зарегистрироваться");
    }
  }

  if (pending) {
    return (
      <VerifyCodeForm
        userId={pending.userId}
        email={pending.email}
        devCode={pending.devCode}
      />
    );
  }

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: '24px',
        padding: '40px 36px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.6) inset',
      }}
    >
      <h1
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color: '#171717',
          letterSpacing: '-0.025em',
          marginBottom: '6px',
        }}
      >
        Создать аккаунт
      </h1>
      <p style={{ fontSize: '14px', color: '#8e8e93', marginBottom: '4px', lineHeight: 1.5 }}>
        3 дня бесплатного триала. Без привязки карты.
      </p>

      {refCode && (
        <div
          style={{
            marginTop: '16px',
            marginBottom: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(0,102,255,0.2)',
            background: 'rgba(0,102,255,0.05)',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#3a3a3e',
          }}
        >
          Вас пригласили по коду{" "}
          <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 600, color: '#0066FF' }}>{refCode}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first_name" style={{ fontSize: '13px', fontWeight: 500 }}>Имя</Label>
            <Input id="first_name" placeholder="Иван" {...register("first_name")} />
            {errors.first_name && (
              <p className="mt-1 text-xs text-destructive">{errors.first_name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="last_name" style={{ fontSize: '13px', fontWeight: 500 }}>Фамилия</Label>
            <Input id="last_name" placeholder="Иванов" {...register("last_name")} />
            {errors.last_name && (
              <p className="mt-1 text-xs text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500 }}>Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password" style={{ fontSize: '13px', fontWeight: 500 }}>Пароль</Label>
          <Input id="password" type="password" placeholder="Минимум 8 символов" {...register("password")} />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirm" style={{ fontSize: '13px', fontWeight: 500 }}>Повторите пароль</Label>
          <Input id="confirm" type="password" placeholder="••••••••" {...register("confirm")} />
          {errors.confirm && (
            <p className="mt-1 text-xs text-destructive">
              {errors.confirm.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          style={{ height: '46px', fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          {isSubmitting ? "Создание..." : "Создать аккаунт"}
        </Button>
      </form>

      <p className="mt-6 text-center" style={{ fontSize: '14px', color: '#8e8e93' }}>
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-semibold text-[#0066FF] hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}

function VerifyCodeForm({
  userId,
  email,
  devCode,
}: {
  userId: string;
  email: string;
  devCode: string | null;
}) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function setDigit(idx: number, val: string) {
    const clean = val.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = clean;
      return next;
    });
    if (clean && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function onKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const arr = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) arr[i] = text[i];
    setDigits(arr);
    const focusIdx = Math.min(text.length, 5);
    inputs.current[focusIdx]?.focus();
  }

  async function submit() {
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Введите 6-значный код");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const user = await authApi.verifyEmailCode(userId, code);
      setUser(user);
      toast.success("Email подтверждён");
      router.push("/dashboard");
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>;
      setError(err.response?.data?.detail ?? "Ошибка подтверждения");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await authApi.resendCode(userId);
      toast.success("Код отправлен повторно");
      setCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      setError(null);
      inputs.current[0]?.focus();
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>;
      toast.error(err.response?.data?.detail ?? "Не удалось отправить код");
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: '24px',
        padding: '40px 36px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.6) inset',
      }}
    >
      <h1
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color: '#171717',
          letterSpacing: '-0.025em',
          marginBottom: '6px',
        }}
      >
        Подтвердите email
      </h1>
      <p style={{ fontSize: '14px', color: '#8e8e93', marginBottom: '24px', lineHeight: 1.5 }}>
        Мы отправили 6-значный код на <strong style={{ color: '#3a3a3e' }}>{email}</strong>
      </p>

      {devCode && (
        <div
          style={{
            marginBottom: '16px',
            borderRadius: '10px',
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.06)',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#92400e',
          }}
        >
          DEV MODE: ваш код —{" "}
          <span style={{ fontFamily: 'Geist Mono, monospace', fontWeight: 700 }}>{devCode}</span>
        </div>
      )}

      <div className="flex gap-2" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            style={{
              flex: 1,
              height: '52px',
              borderRadius: '12px',
              border: d ? '1.5px solid #0066FF' : '1px solid rgba(0,0,0,0.1)',
              background: d ? 'rgba(0,102,255,0.04)' : '#fafafa',
              textAlign: 'center',
              fontSize: '22px',
              fontWeight: 700,
              color: '#171717',
              outline: 'none',
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
          />
        ))}
      </div>

      {error && (
        <p style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444' }}>{error}</p>
      )}

      <Button
        type="button"
        className="w-full mt-6"
        onClick={submit}
        disabled={submitting}
        style={{ height: '46px', fontWeight: 600, letterSpacing: '-0.01em' }}
      >
        {submitting ? "Проверка..." : "Подтвердить"}
      </Button>

      <div className="mt-4 text-center" style={{ fontSize: '14px', color: '#8e8e93' }}>
        {cooldown > 0 ? (
          <span>Повторная отправка через {cooldown} сек</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="font-semibold text-[#0066FF] hover:underline disabled:opacity-50"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {resending ? "Отправка..." : "Отправить код повторно"}
          </button>
        )}
      </div>
    </div>
  );
}
