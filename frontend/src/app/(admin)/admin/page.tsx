"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, CreditCard, Gift } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { adminApi } from "@/api/admin";
import { formatMoney } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats(),
  });

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Админ-панель</h1>
        <p className="text-sm text-muted-foreground">
          Сводка по системе.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          title="Пользователей"
          value={String(stats?.total_users ?? 0)}
        />
        <KpiCard
          icon={CreditCard}
          title="Активных подписок"
          value={String(stats?.active_subscriptions ?? 0)}
        />
        <KpiCard
          icon={DollarSign}
          title="MRR (сумма успешных платежей)"
          value={formatMoney(stats?.mrr ?? 0)}
        />
        <KpiCard
          icon={Gift}
          title="К выплате"
          value={formatMoney(stats?.pending_payouts ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Динамика регистраций</CardTitle>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          График пока не реализован — подключите Chart.js или Recharts.
        </CardContent>
      </Card>
    </>
  );
}

function KpiCard({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Users;
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
