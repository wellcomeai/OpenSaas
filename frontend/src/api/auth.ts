import { apiClient } from "./client";
import type { AuthResponse, TokenPair, User } from "@/types";

export const authApi = {
  async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    referral_code?: string;
  }): Promise<AuthResponse> {
    const r = await apiClient.post("/api/v1/auth/register", data);
    return r.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const r = await apiClient.post("/api/v1/auth/login", { email, password });
    return r.data;
  },

  async refresh(refresh_token: string): Promise<TokenPair> {
    const r = await apiClient.post("/api/v1/auth/refresh", { refresh_token });
    return r.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/v1/auth/logout");
  },

  async confirmEmail(token: string): Promise<User> {
    const r = await apiClient.post("/api/v1/auth/confirm-email", { token });
    return r.data;
  },

  async resendConfirmation(email: string): Promise<void> {
    await apiClient.post("/api/v1/auth/resend-confirmation", { email });
  },

  async verifyEmailCode(user_id: string, code: string): Promise<User> {
    const r = await apiClient.post("/api/v1/auth/verify-email-code", {
      user_id,
      code,
    });
    return r.data;
  },

  async resendCode(user_id: string): Promise<void> {
    await apiClient.post("/api/v1/auth/resend-code", { user_id });
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post("/api/v1/auth/forgot-password", { email });
  },

  async resetPassword(token: string, new_password: string): Promise<User> {
    const r = await apiClient.post("/api/v1/auth/reset-password", {
      token,
      new_password,
    });
    return r.data;
  },
};
