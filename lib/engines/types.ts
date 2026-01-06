/**
 * Shared types for multi-model AI router
 */

export type TaskType = "intent" | "code" | "planning" | "chat" | "execution";
export type ModelProvider = "claude" | "gpt" | "auto";
export type ModelStrategy = "cost" | "quality" | "speed";

export interface RouterOptions {
  model?: ModelProvider;
  strategy?: ModelStrategy;
  temperature?: number;
  maxTokens?: number;
  fallback?: boolean;
}

export interface UsageStats {
  promptTokens: number;
  completionTokens: number;
  totalCost?: number;
}

export interface RouterResponse {
  text: string;
  model: string;
  usage?: UsageStats;
}

export interface ModelConfig {
  name: string;
  available: boolean;
  provider: ModelProvider;
}
