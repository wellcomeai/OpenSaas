"use client";

import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { referralsApi } from "@/api/referrals";
import { formatDateTime, formatMoney } from "@/lib/utils";

const variantByStatus: Record<
  string,
  "default" | "success" | "destructive" | "secondary" | "warning"
> = {
  pending: "warning",
  approved: "default",
  paid: "success",
  rejected: "destructive",
};

export function PayoutHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["referrals-payouts"],
    queryFn: () => referralsApi.payouts(),
  });

  async function copyReferralLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/referrals");
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>История выплат</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="Выплат пока нет"
            description="Пригласите друга — получите 20% от его платежа"
            action={{ label: "Скопировать ссылку", onClick: copyReferralLink }}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Дата</th>
                <th className="py-2">Сумма</th>
                <th className="py-2">Статус</th>
                <th className="py-2">Выплачено</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3">{formatDateTime(p.created_at)}</td>
                  <td className="py-3">{formatMoney(p.amount)}</td>
                  <td className="py-3">
                    <Badge variant={variantByStatus[p.status] ?? "default"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {p.paid_at ? formatDateTime(p.paid_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
