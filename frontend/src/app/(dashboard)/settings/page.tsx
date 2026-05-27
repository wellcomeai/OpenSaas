"use client";

import { useEffect } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usersApi } from "@/api/users";

const schema = z.object({
  first_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  avatar_url: z.string().url("Неверный URL").or(z.literal("")).optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ["user-me"],
    queryFn: () => usersApi.me(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user?.profile) {
      reset({
        first_name: user.profile.first_name ?? "",
        last_name: user.profile.last_name ?? "",
        avatar_url: user.profile.avatar_url ?? "",
      });
    }
  }, [user, reset]);

  const update = useMutation({
    mutationFn: (data: FormValues) =>
      usersApi.updateProfile({
        ...data,
        avatar_url: data.avatar_url || null,
      }),
    onSuccess: () => {
      toast.success("Профиль обновлён");
      qc.invalidateQueries({ queryKey: ["user-me"] });
    },
  });

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Профиль и аккаунт.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Аккаунт</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="flex items-center gap-2">
              {user?.email}
              {user?.is_email_verified ? (
                <Badge variant="success">verified</Badge>
              ) : (
                <Badge variant="warning">not verified</Badge>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Роль</span>
            <Badge variant="secondary">{user?.role}</Badge>
          </div>
          <div>
            <Link
              href="/settings/security"
              className="text-sm text-primary hover:underline"
            >
              Сменить пароль →
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((d) => update.mutate(d))}
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="first_name">Имя</Label>
                <Input id="first_name" {...register("first_name")} />
              </div>
              <div>
                <Label htmlFor="last_name">Фамилия</Label>
                <Input id="last_name" {...register("last_name")} />
              </div>
            </div>
            <div>
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input id="avatar_url" type="url" {...register("avatar_url")} />
              {errors.avatar_url && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.avatar_url.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              Сохранить
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
