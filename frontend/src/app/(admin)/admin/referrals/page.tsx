"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { adminApi } from "@/api/admin";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
];

const PAGE_LIMIT = 20;

export default function AdminReferralsPage() {
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payouts", tab],
    queryFn: () => adminApi.listReferralPayouts(tab),
  });

  const paged = data ? data.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT) : [];

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approvePayout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payouts"] }),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => adminApi.markPayoutPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payouts"] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectPayout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payouts"] }),
  });

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Реферальные выплаты</h1>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={tab === "pending" ? Clock : CheckCircle2}
              title="Ничего нет"
              description={
                tab === "pending"
                  ? "Новых заявок на выплату нет"
                  : "В этом разделе пусто"
              }
            />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3">Создана</th>
                    <th className="px-6 py-3">Реферер</th>
                    <th className="px-6 py-3">Сумма</th>
                    <th className="px-6 py-3">Статус</th>
                    <th className="px-6 py-3">Выплачено</th>
                    <th className="px-6 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-6 py-3">{formatDateTime(p.created_at)}</td>
                      <td className="px-6 py-3 font-mono text-xs">
                        {p.referrer_id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-3 font-medium">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge>{p.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {p.paid_at ? formatDateTime(p.paid_at) : "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {p.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => approve.mutate(p.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reject.mutate(p.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {p.status === "approved" && (
                            <Button
                              size="sm"
                              onClick={() => markPaid.mutate(p.id)}
                            >
                              Mark paid
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={page}
                limit={PAGE_LIMIT}
                hasMore={paged.length === PAGE_LIMIT}
                onNext={() => setPage((p) => p + 1)}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
