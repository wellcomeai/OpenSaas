export type CodeAISessionStatus =
  | "idle"
  | "planning"
  | "awaiting_confirmation"
  | "executing"
  | "done"
  | "error";

export type CodeAIMessageRole = "user" | "assistant" | "system";
export type CodeAIMessageType = "chat" | "plan" | "status" | "diff";

export interface CodeAIRepo {
  full_name: string;
  default_branch: string;
  description: string | null;
}

export interface CodeAIProject {
  id: string;
  user_id: string;
  github_installation_id: string;
  repo_full_name: string;
  repo_default_branch: string;
  is_indexed: boolean;
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CodeAIProjectStatus {
  is_indexed: boolean;
  indexed_at: string | null;
  chunks_count: number;
}

export interface CodeAIPlanFile {
  path: string;
  action: "modify" | "create" | "delete";
  description: string;
}

export interface CodeAIPlan {
  reasoning: string;
  files_to_change: CodeAIPlanFile[];
  branch_name: string;
  pr_title: string;
  pr_description: string;
}

export interface CodeAISession {
  id: string;
  project_id: string;
  user_id: string;
  status: CodeAISessionStatus;
  task: string;
  plan: CodeAIPlan | null;
  pr_url: string | null;
  branch_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CodeAIMessage {
  id: string;
  session_id: string;
  role: CodeAIMessageRole;
  content: string;
  message_type: CodeAIMessageType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CodeAIModel {
  id: string;
  name: string;
  description: string | null;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export interface CodeAISettings {
  planning_model: string;
  editing_model: string;
}

export interface CodeAISettingsUpdate {
  planning_model?: string;
  editing_model?: string;
}
