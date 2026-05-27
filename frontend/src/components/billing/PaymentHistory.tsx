"use client";

import { CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { usePayments } from "@/hooks/useBilling";

const statusVariant: Record<
  string,
  "default" | "success" | "destructive" | "secondary" | "warning"
> = {
  success: "success",
  pending: "warning",
  failed: "destructive",
  refunded: "secondary",
};

export function PaymentHistory() {
  const { data, isLoading } = usePayments();

  return (
    <Card>
      <CardHeader>
        <CardTitle>История платежей</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Платежей пока нет"
            description="Выберите тариф — история появится здесь"
            action={{ label: "Выбрать тариф", href: "/billing" }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Дата</th>
                  <th className="py-2">Сумма</th>
                  <th className="py-2">Провайдер</th>
                  <th className="py-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-3">{formatDateTime(p.created_at)}</td>
                    <td className="py-3">{formatMoney(p.amount, p.currency)}</td>
                    <td className="py-3">{p.provider}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant[p.status] ?? "default"}>
                        {p.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
