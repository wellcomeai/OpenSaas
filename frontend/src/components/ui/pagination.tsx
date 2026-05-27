import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  total?: number;
  limit: number;
  hasMore: boolean;
  onNext: () => void;
  onPrev: () => void;
}

export function Pagination({ page, limit: _limit, hasMore, onNext, onPrev }: PaginationProps) {
  return (
    <div className="flex items-center justify-between border-t px-6 py-3">
      <span className="text-sm text-muted-foreground">Страница {page}</span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasMore}
        >
          Вперёд
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
