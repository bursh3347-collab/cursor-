import { ModelProvider, routeModelRequest, ChatMessage } from "./model-router.js";

export type KeyPoolEntry = {
  name: string;
  provider: ModelProvider;
  endpoint?: string;
  apiKey?: string;
  models: string[];
  weight: number;
  dailyLimit?: number;
  usedToday: number;
  failedUntil?: number;
};

export type RoutedModelResult = {
  provider: ModelProvider;
  model: string;
  entryName: string;
  attempts: Array<{ entryName: string; ok: boolean; status?: number; error?: string }>;
  result: unknown;
};

const defaultEndpoints = {
  openai: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions",
  anthropic: process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com/v1/messages",
  deepseek: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1/chat/completions",
};

function splitEnv(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeModel(model?: string) {
  return (model ?? "").toLowerCase();
}

function detectProvider(model?: string): ModelProvider {
  const normalized = normalizeModel(model);
  if (normalized.includes("claude")) return "anthropic";
  if (normalized.includes("gemini")) return "gemini";
  return "openai-compatible";
}

function parseJsonPool(): KeyPoolEntry[] {
  const raw = process.env.MODEL_POOL_JSON;
  if (!raw) return [];
  const parsed = JSON.parse(raw) as Array<Partial<KeyPoolEntry>>;
  return parsed.map((entry, index) => ({
    name: entry.name ?? `json-pool-${index + 1}`,
    provider: entry.provider ?? "openai-compatible",
    endpoint: entry.endpoint,
    apiKey: entry.apiKey,
    models: entry.models ?? ["*"],
    weight: entry.weight ?? 1,
    dailyLimit: entry.dailyLimit,
    usedToday: entry.usedToday ?? 0,
  }));
}

function parseEnvPool(): KeyPoolEntry[] {
  const entries: KeyPoolEntry[] = [];

  splitEnv("OPENAI_API_KEY").forEach((key, index) => {
    entries.push({
      name: `openai-${index + 1}`,
      provider: "openai-compatible",
      endpoint: process.env.OPENAI_COMPATIBLE_BASE_URL || defaultEndpoints.openai,
      apiKey: key,
      models: ["gpt", "o1", "o3", "o4"],
      weight: 1,
      usedToday: 0,
    });
  });

  splitEnv("DEEPSEEK_API_KEY").forEach((key, index) => {
    entries.push({
      name: `deepseek-${index + 1}`,
      provider: "openai-compatible",
      endpoint: defaultEndpoints.deepseek,
      apiKey: key,
      models: ["deepseek"],
      weight: 1,
      usedToday: 0,
    });
  });

  splitEnv("ANTHROPIC_API_KEY").forEach((key, index) => {
    entries.push({
      name: `anthropic-${index + 1}`,
      provider: "anthropic",
      endpoint: defaultEndpoints.anthropic,
      apiKey: key,
      models: ["claude"],
      weight: 1,
      usedToday: 0,
    });
  });

  splitEnv("GEMINI_API_KEY").forEach((key, index) => {
    entries.push({
      name: `gemini-${index + 1}`,
      provider: "gemini",
      endpoint: process.env.GEMINI_BASE_URL,
      apiKey: key,
      models: ["gemini"],
      weight: 1,
      usedToday: 0,
    });
  });

  return entries;
}

const pool: KeyPoolEntry[] = [...parseJsonPool(), ...parseEnvPool()];

export function getPoolStatus() {
  return pool.map((entry) => ({
    name: entry.name,
    provider: entry.provider,
    endpoint: entry.endpoint ? maskEndpoint(entry.endpoint) : undefined,
    models: entry.models,
    dailyLimit: entry.dailyLimit,
    usedToday: entry.usedToday,
    healthy: !entry.failedUntil || entry.failedUntil < Date.now(),
  }));
}

function maskEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return endpoint;
  }
}

function supports(entry: KeyPoolEntry, model?: string, provider?: ModelProvider) {
  if (provider && provider !== entry.provider) return false;
  if (!model) return true;
  const normalized = normalizeModel(model);
  return entry.models.includes("*") || entry.models.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function available(entry: KeyPoolEntry) {
  if (entry.failedUntil && entry.failedUntil > Date.now()) return false;
  if (entry.dailyLimit && entry.usedToday >= entry.dailyLimit) return false;
  return true;
}

function weightedSort(entries: KeyPoolEntry[]) {
  return [...entries].sort((a, b) => {
    const aScore = a.usedToday / Math.max(1, a.weight);
    const bScore = b.usedToday / Math.max(1, b.weight);
    return aScore - bScore;
  });
}

export function estimateCredits(model?: string) {
  const normalized = normalizeModel(model);
  if (normalized.includes("gpt-4") || normalized.includes("claude") || normalized.includes("gemini-1.5-pro") || normalized.includes("gemini-2")) return 5;
  if (normalized.includes("deepseek") || normalized.includes("qwen") || normalized.includes("mini") || normalized.includes("haiku")) return 1;
  return 2;
}

export async function routeWithPool(args: {
  provider?: ModelProvider;
  endpoint?: string;
  apiKey?: string;
  model?: string;
  messages: ChatMessage[];
}): Promise<RoutedModelResult> {
  // BYOK/custom endpoint still wins.
  if (args.endpoint || args.apiKey) {
    const provider = args.provider ?? detectProvider(args.model);
    const result = await routeModelRequest({
      provider,
      endpoint: args.endpoint,
      apiKey: args.apiKey,
      model: args.model,
      messages: args.messages,
    });
    return {
      provider,
      model: args.model ?? "custom-model",
      entryName: "custom-byok",
      attempts: [{ entryName: "custom-byok", ok: true }],
      result,
    };
  }

  const provider = args.provider && args.provider !== "mock" ? args.provider : detectProvider(args.model);
  const candidates = weightedSort(pool.filter((entry) => supports(entry, args.model, provider) && available(entry)));
  const attempts: RoutedModelResult["attempts"] = [];

  if (candidates.length === 0) {
    const result = await routeModelRequest({ provider: "mock", model: args.model, messages: args.messages });
    return { provider: "mock", model: args.model ?? "mock-model", entryName: "mock-no-key", attempts, result };
  }

  for (const entry of candidates) {
    try {
      const model = args.model ?? defaultModelFor(entry.provider);
      const endpoint = entry.provider === "gemini" && !entry.endpoint
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
        : entry.endpoint;
      const result = await routeModelRequest({
        provider: entry.provider,
        endpoint,
        apiKey: entry.apiKey,
        model,
        messages: args.messages,
      });
      const ok = typeof result === "object" && result !== null && "ok" in result ? Boolean((result as { ok?: boolean }).ok) : true;
      const status = typeof result === "object" && result !== null && "status" in result ? Number((result as { status?: number }).status) : undefined;
      attempts.push({ entryName: entry.name, ok, status });
      if (ok) {
        entry.usedToday += estimateCredits(model);
        return { provider: entry.provider, model, entryName: entry.name, attempts, result };
      }
      if (status === 401 || status === 403 || status === 429 || (status && status >= 500)) {
        entry.failedUntil = Date.now() + 60_000;
      }
    } catch (error) {
      attempts.push({ entryName: entry.name, ok: false, error: error instanceof Error ? error.message : String(error) });
      entry.failedUntil = Date.now() + 60_000;
    }
  }

  return {
    provider: "mock",
    model: args.model ?? "mock-model",
    entryName: "mock-all-failed",
    attempts,
    result: {
      ok: false,
      message: "All configured provider keys failed. Check API keys, endpoints, quota, or model names.",
    },
  };
}

function defaultModelFor(provider: ModelProvider) {
  if (provider === "anthropic") return "claude-3-5-sonnet-latest";
  if (provider === "gemini") return "gemini-1.5-pro";
  return "gpt-4o-mini";
}
