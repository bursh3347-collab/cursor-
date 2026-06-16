import { ModelProvider } from "./model-router.js";

export type ProviderPoolConfig = {
  provider: ModelProvider;
  endpoint?: string;
  apiKey?: string;
  model?: string;
};

const openAIBaseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions";
const anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1/messages";
const geminiBaseUrl = process.env.GEMINI_BASE_URL;
const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1/chat/completions";

function normalizeModel(model?: string) {
  return (model ?? "").toLowerCase();
}

export function resolveProviderPool(args: {
  provider?: ModelProvider;
  endpoint?: string;
  apiKey?: string;
  model?: string;
}): ProviderPoolConfig {
  // 用户在插件里填写的 endpoint/key 优先，用于 BYOK。
  if (args.endpoint || args.apiKey) {
    return {
      provider: args.provider ?? "openai-compatible",
      endpoint: args.endpoint,
      apiKey: args.apiKey,
      model: args.model,
    };
  }

  const model = normalizeModel(args.model);

  if (args.provider === "anthropic" || model.includes("claude")) {
    return {
      provider: "anthropic",
      endpoint: anthropicBaseUrl,
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: args.model ?? "claude-3-5-sonnet-latest",
    };
  }

  if (args.provider === "gemini" || model.includes("gemini")) {
    const geminiModel = args.model ?? "gemini-1.5-pro";
    return {
      provider: "gemini",
      endpoint: geminiBaseUrl ?? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      apiKey: process.env.GEMINI_API_KEY,
      model: geminiModel,
    };
  }

  if (model.includes("deepseek")) {
    return {
      provider: "openai-compatible",
      endpoint: deepseekBaseUrl,
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: args.model ?? "deepseek-chat",
    };
  }

  return {
    provider: args.provider ?? "openai-compatible",
    endpoint: process.env.OPENAI_COMPATIBLE_BASE_URL ?? openAIBaseUrl,
    apiKey: process.env.OPENAI_API_KEY,
    model: args.model ?? "gpt-4o-mini",
  };
}
