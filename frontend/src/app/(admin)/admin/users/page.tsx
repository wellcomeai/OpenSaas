"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { adminApi } from "@/api/admin";
import { formatDateTime } from "@/lib/utils";

const PAGE_LIMIT = 20;

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", role, status, page],
    queryFn: () =>
      adminApi.listUsers({
        page,
        limit: PAGE_LIMIT,
        role: role || undefined,
        status: status || undefined,
      }),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((u) => u.email.toLowerCase().includes(q));
  }, [data, search]);

  const setRoleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "admin" | "user" }) =>
      adminApi.setRole(id, role),
    onSuccess: () => {
      toast.success("Роль обновлена");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const block = useMutation({
    mutationFn: (id: string) => adminApi.blockUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const unblock = useMutation({
    mutationFn: (id: string) => adminApi.unblockUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Пользователи</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Поиск по email"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Все роли</option>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Никого не нашлось"
              description="Попробуйте изменить фильтр"
            />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Роль</th>
                    <th className="px-6 py-3">Email подтв.</th>
                    <th className="px-6 py-3">Активен</th>
                    <th className="px-6 py-3">Зарегистрирован</th>
                    <th className="px-6 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-6 py-3 font-medium">{u.email}</td>
                      <td className="px-6 py-3">
                        <Badge variant="secondary">{u.role}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={u.is_email_verified ? "success" : "warning"}
                        >
                          {u.is_email_verified ? "yes" : "no"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={u.is_active ? "success" : "destructive"}>
                          {u.is_active ? "active" : "blocked"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {formatDateTime(u.created_at)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRoleMut.mutate({
                                id: u.id,
                                role: u.role === "admin" ? "user" : "admin",
                              })
                            }
                          >
                            {u.role === "admin" ? "Снять админа" : "В админы"}
                          </Button>
                          {u.is_active ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => block.mutate(u.id)}
                            >
                              Блок
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unblock.mutate(u.id)}
                            >
                              Разблок
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
                hasMore={data?.length === PAGE_LIMIT}
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
