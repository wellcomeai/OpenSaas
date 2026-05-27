"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authApi } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { usersApi } from "@/api/users";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, isLoading, initialized, setUser, setLoading, setSession, logout } =
    useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (initialized || !tokenStorage.access) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    usersApi
      .me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) {
          tokenStorage.clear();
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,

    async login(email: string, password: string) {
      const res = await authApi.login(email, password);
      setSession(res.user, res.access_token, res.refresh_token);
      router.push("/dashboard");
      return res;
    },

    async register(
      email: string,
      password: string,
      first_name: string,
      last_name: string,
      referral_code?: string,
    ) {
      const res = await authApi.register({ email, password, first_name, last_name, referral_code });
      setSession(res.user, res.access_token, res.refresh_token);
      if (res.pending_verification) {
        return {
          pendingVerification: true as const,
          userId: res.user.id,
          devCode: res.dev_code ?? null,
        };
      }
      router.push("/dashboard");
      return { pendingVerification: false as const };
    },

    async logout() {
      try {
        await authApi.logout();
      } catch {
        // ignore
      }
      logout();
      router.push("/login");
    },
  };
}
