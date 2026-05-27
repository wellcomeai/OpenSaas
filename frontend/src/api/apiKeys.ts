import { apiClient } from "./client";
import type { ApiKey, ApiKeyCreated } from "@/types";

export const apiKeysApi = {
  async list(): Promise<ApiKey[]> {
    const r = await apiClient.get("/api/v1/api-keys");
    return r.data;
  },

  async create(data: {
    name: string;
    scopes: string[];
    expires_at?: string | null;
  }): Promise<ApiKeyCreated> {
    const r = await apiClient.post("/api/v1/api-keys", data);
    return r.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/api-keys/${id}`);
  },

  async revoke(id: string): Promise<ApiKey> {
    const r = await apiClient.patch(`/api/v1/api-keys/${id}/revoke`);
    return r.data;
  },
};
