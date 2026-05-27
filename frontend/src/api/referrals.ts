import { apiClient } from "./client";
import type {
  MyReferralCode,
  ReferralPayout,
  ReferralStats,
  ReferralUser,
} from "@/types";

export const referralsApi = {
  async myCode(): Promise<MyReferralCode> {
    const r = await apiClient.get("/api/v1/referrals/my-code");
    return r.data;
  },

  async stats(): Promise<ReferralStats> {
    const r = await apiClient.get("/api/v1/referrals/stats");
    return r.data;
  },

  async payouts(limit = 50, offset = 0): Promise<ReferralPayout[]> {
    const r = await apiClient.get("/api/v1/referrals/payouts", {
      params: { limit, offset },
    });
    return r.data;
  },

  async referredUsers(): Promise<ReferralUser[]> {
    const r = await apiClient.get("/api/v1/referrals/referred-users");
    return r.data;
  },
};
