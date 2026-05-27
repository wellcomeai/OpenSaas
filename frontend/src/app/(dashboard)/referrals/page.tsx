"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ReferralWidget } from "@/components/referrals/ReferralWidget";
import { PayoutHistory } from "@/components/referrals/PayoutHistory";
import { referralsApi } from "@/api/referrals";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { Users } from "lucide-react";

export default function ReferralsPage() {
  const { data } = useQuery({
    queryKey: ["referrals-my-code"],
    queryFn: () => referralsApi.myCode(),
  });

  const { data: referredList } = useQuery({
    queryKey: ["referrals-referred-users"],
    queryFn: () => referralsApi.referredUsers(),
  });

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Реферальная программа</h1>
        <p className="text-sm text-muted-foreground">
          Приглашайте друзей и получайте 20% от их платежей.
        </p>
      </div>

      {data && <ReferralWidget code={data.code} url={data.url} />}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Приглашено</CardDescription>
            <CardTitle className="text-2xl">
              {data?.stats.total_referred ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Оплатили</CardDescription>
            <CardTitle className="text-2xl">
              {data?.stats.converted ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Заработано</CardDescription>
            <CardTitle className="text-2xl">
              {formatMoney(data?.stats.total_earned ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ожидает</CardDescription>
            <CardTitle className="text-2xl">
              {formatMoney(data?.stats.pending_payout ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <PayoutHistory />

      <Card>
        <CardHeader>
          <CardTitle>Приглашённые пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          {!referredList || referredList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Пока никого"
              description="Поделитесь ссылкой — она выше"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Имя</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Статус</th>
                  <th className="py-2">Дата</th>
                </tr>
              </thead>
              <tbody>
                {referredList.map((u) => (
                  <tr key={u.email} className="border-b last:border-0">
                    <td className="py-3">
                      {u.first_name || u.last_name
                        ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim()
                        : "—"}
                    </td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3">
                      <Badge variant={
                        u.status === "converted" ? "success" :
                        u.status === "trial" ? "warning" : "secondary"
                      }>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {formatDateTime(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Как это работает</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-4 text-sm md:grid-cols-3">
            <li>
              <div className="text-2xl font-bold">1</div>
              <div className="mt-1 text-muted-foreground">
                Поделитесь своей реферальной ссылкой с друзьями.
              </div>
            </li>
            <li>
              <div className="text-2xl font-bold">2</div>
              <div className="mt-1 text-muted-foreground">
                Они регистрируются по вашей ссылке и начинают триал.
              </div>
            </li>
            <li>
              <div className="text-2xl font-bold">3</div>
              <div className="mt-1 text-muted-foreground">
                Когда они оплачивают подписку, вы получаете 20% от платежа.
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </>
  );
}
