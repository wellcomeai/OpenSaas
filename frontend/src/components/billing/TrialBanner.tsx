"use client";

import Link from "next/link";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTrialStatus } from "@/hooks/useTrialStatus";

export function TrialBanner() {
  const { isTrial, daysLeft, isExpired } = useTrialStatus();

  if (!isTrial) return null;

  const isUrgent = !isExpired && daysLeft <= 1;

  return (
    <div
      className={
        isExpired
          ? "flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-4"
          : isUrgent
          ? "flex items-center justify-between rounded-lg border border-orange-400/40 bg-orange-50 p-4"
          : "flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4"
      }
    >
      <div className="flex items-center gap-3">
        <Clock className="h-5 w-5" />
        <div className="text-sm">
          {isExpired ? (
            <span className="font-medium">
              Триал закончился — выберите тариф, чтобы продолжить
            </span>
          ) : (
            <>
              <span className="font-medium">
                Триал активен,{" "}
                {daysLeft === 0
                  ? "последний день"
                  : `осталось ${daysLeft} дн.`}
              </span>
              <span className="ml-2 text-muted-foreground">
                Выберите тариф, чтобы не потерять доступ.
              </span>
            </>
          )}
        </div>
      </div>
      <Link href="/billing">
        <Button size="sm" variant={isExpired ? "default" : "outline"}>
          Перейти к подписке
        </Button>
      </Link>
    </div>
  );
}
