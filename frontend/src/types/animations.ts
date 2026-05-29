export type AnimationJobStatus =
  | "queued"
  | "generating_html"
  | "rendering"
  | "encoding"
  | "done"
  | "error";

export type AnimationAspect = "9:16" | "1:1" | "16:9";

export interface AnimationGenerateRequest {
  prompt: string;
  duration: number;
  fps: number;
  aspect: AnimationAspect;
}

export interface AnimationGenerateResponse {
  job_id: string;
  status: AnimationJobStatus;
}

export interface AnimationJob {
  job_id: string;
  status: AnimationJobStatus;
  progress: number;
  prompt: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  download_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
