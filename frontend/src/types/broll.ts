export type BrollStatus = "pending" | "processing" | "done" | "error";

export interface BrollJob {
  id: string;
  prompt: string;
  status: BrollStatus;
  scene: string | null;
  params: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}
