"use client";

import { Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

export function EmailBanner() {
  const user = useAuthStore((s) => s.user);

  if (!user || user.is_email_verified) return null;

  async function resend() {
    if (!user) return;
    try {
      await authApi.resendConfirmation(user.email);
      toast.success("Письмо отправлено. Проверьте почту.");
    } catch {
      toast.error("Не удалось отправить письмо");
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-yellow-300/50 bg-yellow-50 p-4 text-yellow-900">
      <div className="flex items-center gap-3 text-sm">
        <Mail className="h-5 w-5" />
        <span>
          Подтвердите email — иначе будут ограничения (например, создание API ключей).
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={resend}>
        Отправить повторно
      </Button>
    </div>
  );
}
