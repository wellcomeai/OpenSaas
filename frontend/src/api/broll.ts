import { apiClient } from "./client";
import type { BrollJob } from "@/types/broll";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const brollApi = {
  async generate(prompt: string): Promise<BrollJob> {
    const r = await apiClient.post("/api/v1/broll/generate", { prompt });
    return r.data;
  },

  async listJobs(): Promise<BrollJob[]> {
    const r = await apiClient.get("/api/v1/broll/jobs");
    return r.data;
  },

  async getJob(id: string): Promise<BrollJob> {
    const r = await apiClient.get(`/api/v1/broll/jobs/${id}`);
    return r.data;
  },

  // Путь к файлу. ВАЖНО: эндпоинт защищён JWT, поэтому <video src> напрямую
  // его не загрузит — нужно тянуть через apiClient как blob (см. page.tsx).
  fileUrl(id: string): string {
    return `${API_URL}/api/v1/broll/jobs/${id}/file`;
  },
};
