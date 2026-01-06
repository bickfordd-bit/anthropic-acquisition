/**
 * Multi-model AI router that intelligently selects and routes requests
 * to the best available model based on task type and configuration.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  TaskType,
  ModelProvider,
  ModelStrategy,
  RouterOptions,
  RouterResponse,
} from "./types";

// Model preference mapping based on task type
const MODEL_PREFERENCES: Record<TaskType, ModelProvider[]> = {
  intent: ["claude", "gpt"], // Claude best at reasoning
  code: ["gpt", "claude"], // GPT faster at code
  planning: ["claude", "gpt"], // Claude best at multi-step
  chat: ["claude", "gpt"], // Claude for conversational
  execution: ["claude", "gpt"], // Claude for safety
};

// Cost optimization: simpler tasks can use faster/cheaper models
const SIMPLE_TASK_PATTERNS = [
  /^(hi|hello|hey|thanks|thank you)/i,
  /^(yes|no|ok|okay|sure)/i,
];

// Environment configuration
function getEnvConfig() {
  return {
    defaultModel:
      (process.env.BICKFORD_DEFAULT_MODEL as ModelProvider) || "auto",
    enableFallback: process.env.BICKFORD_ENABLE_FALLBACK !== "false",
    modelStrategy:
      (process.env.BICKFORD_MODEL_STRATEGY as ModelStrategy) || "quality",
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
  };
}

// Check if API keys are available
function isModelAvailable(provider: ModelProvider): boolean {
  const config = getEnvConfig();
  if (provider === "claude") return !!config.anthropicKey;
  if (provider === "gpt") return !!config.openaiKey;
  return false;
}

// Determine if prompt is simple enough for cost optimization
function isSimplePrompt(prompt: string): boolean {
  return SIMPLE_TASK_PATTERNS.some((pattern) => pattern.test(prompt.trim()));
}

// Select the best model based on task type and configuration
function selectModel(
  taskType: TaskType,
  options: RouterOptions = {}
): ModelProvider {
  const config = getEnvConfig();

  // Explicit model selection overrides everything
  if (options.model && options.model !== "auto") {
    return options.model;
  }

  // Use configured default if not "auto"
  if (config.defaultModel !== "auto") {
    return config.defaultModel;
  }

  // Get preferred models for this task type
  const preferences = MODEL_PREFERENCES[taskType] || ["claude", "gpt"];

  // Find the first available model in preference order
  for (const provider of preferences) {
    if (isModelAvailable(provider)) {
      return provider;
    }
  }

  // Fallback to any available model
  if (isModelAvailable("claude")) return "claude";
  if (isModelAvailable("gpt")) return "gpt";

  throw new Error("No AI models available. Please configure API keys.");
}

// Extract text from Anthropic response
function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Call Claude API
async function callClaude(
  prompt: string,
  options: RouterOptions
): Promise<RouterResponse> {
  const config = getEnvConfig();
  if (!config.anthropicKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const anthropic = new Anthropic({
    apiKey: config.anthropicKey,
  });

  const model =
    process.env.ANTHROPIC_CHAT_MODEL ?? "claude-3-5-sonnet-latest";
  const maxTokens = options.maxTokens ?? 512;
  const temperature = options.temperature ?? 0.2;

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content: prompt }],
  });

  const text = extractText(message.content as any);
  const usage = (message as any).usage;

  return {
    text,
    model: `claude:${model}`,
    usage: usage
      ? {
          promptTokens: usage.input_tokens || 0,
          completionTokens: usage.output_tokens || 0,
        }
      : undefined,
  };
}

// Call OpenAI/GPT API
async function callGPT(
  prompt: string,
  options: RouterOptions
): Promise<RouterResponse> {
  const config = getEnvConfig();
  if (!config.openaiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4-turbo-preview";
  const maxTokens = options.maxTokens ?? 512;
  const temperature = options.temperature ?? 0.2;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  const text = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage;

  return {
    text,
    model: `gpt:${model}`,
    usage: usage
      ? {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
        }
      : undefined,
  };
}

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Route a request to the best available AI model
 */
export async function routeModelRequest(
  prompt: string,
  taskType: TaskType,
  options: RouterOptions = {}
): Promise<RouterResponse> {
  const config = getEnvConfig();

  // Apply cost optimization for simple prompts
  const strategy = options.strategy ?? config.modelStrategy;
  if (strategy === "cost" && isSimplePrompt(prompt)) {
    // For cost optimization, prefer GPT for simple queries
    if (isModelAvailable("gpt")) {
      options.model = "gpt";
    }
  }

  // Select primary model
  const primaryModel = selectModel(taskType, options);

  // Try primary model with retry
  try {
    return await retryWithBackoff(async () => {
      if (primaryModel === "claude") {
        return await callClaude(prompt, options);
      } else {
        return await callGPT(prompt, options);
      }
    });
  } catch (primaryError) {
    // If fallback is disabled, throw the error
    const enableFallback = options.fallback ?? config.enableFallback;
    if (!enableFallback) {
      throw primaryError;
    }

    // Try fallback model
    const fallbackModel = primaryModel === "claude" ? "gpt" : "claude";
    if (!isModelAvailable(fallbackModel)) {
      throw new Error(
        `Primary model (${primaryModel}) failed and no fallback available: ${(primaryError as Error).message}`
      );
    }

    try {
      const response =
        fallbackModel === "claude"
          ? await callClaude(prompt, options)
          : await callGPT(prompt, options);

      // Mark as fallback in model name
      return {
        ...response,
        model: `${response.model} (fallback)`,
      };
    } catch (fallbackError) {
      throw new Error(
        `Both primary (${primaryModel}) and fallback (${fallbackModel}) failed. Primary: ${(primaryError as Error).message}, Fallback: ${(fallbackError as Error).message}`
      );
    }
  }
}

/**
 * Get available models and their status
 */
export function getAvailableModels(): Array<{
  provider: ModelProvider;
  available: boolean;
}> {
  return [
    { provider: "claude", available: isModelAvailable("claude") },
    { provider: "gpt", available: isModelAvailable("gpt") },
  ];
}
