"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usersApi } from "@/api/users";

const schema = z
  .object({
    current_password: z.string().min(1, "Введите текущий пароль"),
    new_password: z.string().min(8, "Минимум 8 символов"),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    path: ["confirm"],
    message: "Пароли не совпадают",
  });

type FormValues = z.infer<typeof schema>;

export default function SecurityPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mut = useMutation({
    mutationFn: (data: FormValues) =>
      usersApi.changePassword(data.current_password, data.new_password),
    onSuccess: () => {
      toast.success("Пароль изменён");
      reset();
    },
    onError: (e) => {
      const err = e as AxiosError<{ detail?: string }>;
      toast.error(err.response?.data?.detail ?? "Не удалось сменить пароль");
    },
  });

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Безопасность</h1>
        <p className="text-sm text-muted-foreground">Смена пароля.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Новый пароль</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((d) => mut.mutate(d))}
            className="space-y-4 max-w-md"
          >
            <div>
              <Label htmlFor="current_password">Текущий пароль</Label>
              <Input
                id="current_password"
                type="password"
                {...register("current_password")}
              />
              {errors.current_password && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.current_password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="new_password">Новый пароль</Label>
              <Input
                id="new_password"
                type="password"
                {...register("new_password")}
              />
              {errors.new_password && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.new_password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm">Повторите новый пароль</Label>
              <Input id="confirm" type="password" {...register("confirm")} />
              {errors.confirm && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.confirm.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              Сменить пароль
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
