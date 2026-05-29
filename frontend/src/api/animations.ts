import { apiClient } from "./client";
import type {
  AnimationGenerateRequest,
  AnimationGenerateResponse,
  AnimationJob,
} from "@/types/animations";

export const animationsApi = {
  async generate(
    data: AnimationGenerateRequest,
  ): Promise<AnimationGenerateResponse> {
    const r = await apiClient.post("/api/v1/animations/generate", data);
    return r.data;
  },

  async getJob(jobId: string): Promise<AnimationJob> {
    const r = await apiClient.get(`/api/v1/animations/jobs/${jobId}`);
    return r.data;
  },

  async listJobs(): Promise<AnimationJob[]> {
    const r = await apiClient.get("/api/v1/animations/jobs");
    return r.data;
  },

  // Скачивание идёт через apiClient (с JWT-заголовком), как blob —
  // чтобы не светить токен в URL. Возвращаем object URL для <video>/<a>.
  async downloadBlobUrl(jobId: string): Promise<string> {
    const r = await apiClient.get(
      `/api/v1/animations/jobs/${jobId}/download`,
      { responseType: "blob" },
    );
    return URL.createObjectURL(r.data as Blob);
  },
};
