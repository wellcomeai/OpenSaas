"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(8, "Минимум 8 символов"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    try {
      await login(values.email, values.password);
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>;
      toast.error(err.response?.data?.detail ?? "Не удалось войти");
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
        Добро пожаловать
      </h1>
      <p style={{ fontSize: '14px', color: '#8e8e93', marginBottom: '28px', lineHeight: 1.5 }}>
        Введите данные, чтобы войти в аккаунт
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500 }}>Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="password" style={{ fontSize: '13px', fontWeight: 500 }}>Пароль</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#0066FF] hover:underline"
              style={{ textDecoration: 'none' }}
            >
              Забыли пароль?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          style={{ height: '46px', fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          {isSubmitting ? "Вход..." : "Войти"}
        </Button>
      </form>

      <p className="mt-6 text-center" style={{ fontSize: '14px', color: '#8e8e93' }}>
        Нет аккаунта?{" "}
        <Link href="/register" className="font-semibold text-[#0066FF] hover:underline">
          Зарегистрируйтесь
        </Link>
      </p>
    </div>
  );
}
