import { apiClient } from "./client";
import type { User } from "@/types";

export const usersApi = {
  async me(): Promise<User> {
    const r = await apiClient.get("/api/v1/users/me");
    return r.data;
  },

  async updateProfile(data: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  }): Promise<User> {
    const r = await apiClient.put("/api/v1/users/me", data);
    return r.data;
  },

  async changePassword(
    current_password: string,
    new_password: string,
  ): Promise<void> {
    await apiClient.put("/api/v1/users/me/password", {
      current_password,
      new_password,
    });
  },

  async deleteMe(): Promise<void> {
    await apiClient.delete("/api/v1/users/me");
  },
};
