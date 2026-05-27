"use client";

import { useSubscription } from "./useBilling";
import { daysUntil } from "@/lib/utils";

export interface TrialStatus {
  isTrial: boolean;
  isExpired: boolean;
  daysLeft: number;
  endsAt: string | null;
}

export function useTrialStatus(): TrialStatus {
  const { data: sub } = useSubscription();

  if (!sub) {
    return { isTrial: false, isExpired: false, daysLeft: 0, endsAt: null };
  }

  const isTrial = sub.status === "trial";
  const daysLeft = isTrial ? daysUntil(sub.current_period_end) : 0;
  const isExpired = isTrial && daysLeft <= 0;

  return {
    isTrial,
    isExpired,
    daysLeft,
    endsAt: sub.current_period_end,
  };
}
