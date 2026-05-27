"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Props {
  code: string;
  url: string;
}

export function ReferralWidget({ code, url }: Props) {
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Скопировано");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ваша реферальная ссылка</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Код</div>
          <div className="flex gap-2">
            <Input readOnly value={code} className="font-mono" />
            <Button variant="outline" size="icon" onClick={() => copy(code)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Ссылка</div>
          <div className="flex gap-2">
            <Input readOnly value={url} />
            <Button variant="outline" size="icon" onClick={() => copy(url)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
