"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { TrialBanner } from "@/components/billing/TrialBanner";
import { PlanCard } from "@/components/billing/PlanCard";
import { PaymentHistory } from "@/components/billing/PaymentHistory";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlans, useSubscription } from "@/hooks/useBilling";
import { billingApi } from "@/api/billing";
import { formatDateTime } from "@/lib/utils";
import type { Plan } from "@/types";

function PaymentStatusHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  useEffect(() => {
    const status = params.get("status");
    if (!status) return;

    if (status === "success") {
      toast.success("Подписка активирована!");
      qc.invalidateQueries({ queryKey: ["subscription"] });
    } else if (status === "failed") {
      toast.error("Платёж не прошёл. Попробуйте ещё раз.");
    }

    router.replace("/billing");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function BillingPage() {
  const { data: plans } = usePlans();
  const { data: sub } = useSubscription();
  const qc = useQueryClient();

  const subscribe = useMutation({
    mutationFn: (plan: Plan) =>
      billingApi.subscribe(plan.id, "robokassa"),
    onSuccess: (r) => {
      window.location.href = r.payment_url;
    },
    onError: (e) => {
      const err = e as AxiosError<{ detail?: string }>;
      toast.error(err.response?.data?.detail ?? "Не удалось создать платёж");
    },
  });

  const cancel = useMutation({
    mutationFn: () => billingApi.cancel(),
    onSuccess: () => {
      toast.success("Подписка отменена");
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  return (
    <>
      <Suspense>
        <PaymentStatusHandler />
      </Suspense>

      <div style={{ marginBottom: '8px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#171717',
            letterSpacing: '-0.025em',
            marginBottom: '4px',
          }}
        >
          Подписка
        </h1>
        <p style={{ fontSize: '14px', color: '#8e8e93' }}>
          Управление подпиской и платежами
        </p>
      </div>

      <TrialBanner />

      {sub && (
        <Card>
          <CardHeader>
            <CardTitle>Текущая подписка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Статус</span>
              <Badge variant={sub.status === "active" ? "success" : "secondary"}>
                {sub.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Действует до</span>
              <span>{formatDateTime(sub.current_period_end)}</span>
            </div>
            {sub.status === "active" && !sub.cancelled_at && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                Отменить подписку
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-xl font-semibold">Тарифы</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              active={sub?.plan_id === plan.id}
              loading={subscribe.isPending}
              onSubscribe={(p) => subscribe.mutate(p)}
            />
          ))}
        </div>
      </div>

      <PaymentHistory />
    </>
  );
}
