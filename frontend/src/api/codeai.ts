import { apiClient } from "./client";
import type {
  CodeAIMessage,
  CodeAIModel,
  CodeAIProject,
  CodeAIProjectStatus,
  CodeAIRepo,
  CodeAISession,
  CodeAISettings,
  CodeAISettingsUpdate,
} from "@/types/codeai";

export const codeaiApi = {
  // GitHub
  async listRepos(): Promise<CodeAIRepo[]> {
    const r = await apiClient.get("/api/v1/codeai/repos");
    return r.data;
  },

  // Projects
  async listProjects(): Promise<CodeAIProject[]> {
    const r = await apiClient.get("/api/v1/codeai/projects");
    return r.data;
  },

  async createProject(data: {
    repo_full_name: string;
    github_installation_id: string;
    repo_default_branch?: string;
  }): Promise<CodeAIProject> {
    const r = await apiClient.post("/api/v1/codeai/projects", data);
    return r.data;
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/codeai/projects/${id}`);
  },

  async startIndexing(id: string): Promise<void> {
    await apiClient.post(`/api/v1/codeai/projects/${id}/index`);
  },

  async getProjectStatus(id: string): Promise<CodeAIProjectStatus> {
    const r = await apiClient.get(`/api/v1/codeai/projects/${id}/status`);
    return r.data;
  },

  async listProjectSessions(projectId: string): Promise<CodeAISession[]> {
    const r = await apiClient.get(
      `/api/v1/codeai/projects/${projectId}/sessions`,
    );
    return r.data;
  },

  // Sessions
  async createSession(data: {
    project_id: string;
    task: string;
  }): Promise<CodeAISession> {
    const r = await apiClient.post("/api/v1/codeai/sessions", data);
    return r.data;
  },

  async getSession(id: string): Promise<CodeAISession> {
    const r = await apiClient.get(`/api/v1/codeai/sessions/${id}`);
    return r.data;
  },

  async getMessages(sessionId: string): Promise<CodeAIMessage[]> {
    const r = await apiClient.get(`/api/v1/codeai/sessions/${sessionId}/messages`);
    return r.data;
  },

  async confirmPlan(sessionId: string): Promise<CodeAISession> {
    const r = await apiClient.post(
      `/api/v1/codeai/sessions/${sessionId}/confirm`,
    );
    return r.data;
  },

  async cancelSession(sessionId: string): Promise<CodeAISession> {
    const r = await apiClient.post(
      `/api/v1/codeai/sessions/${sessionId}/cancel`,
    );
    return r.data;
  },

  // Settings & models
  async getAvailableModels(): Promise<CodeAIModel[]> {
    const r = await apiClient.get("/api/v1/codeai/models");
    return r.data;
  },

  async getSettings(): Promise<CodeAISettings> {
    const r = await apiClient.get("/api/v1/codeai/settings");
    return r.data;
  },

  async updateSettings(data: CodeAISettingsUpdate): Promise<CodeAISettings> {
    const r = await apiClient.put("/api/v1/codeai/settings", data);
    return r.data;
  },
};
