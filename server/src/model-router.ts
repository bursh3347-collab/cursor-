export type ModelProvider = "openai-compatible" | "anthropic" | "gemini" | "mock";

export type ChatMessage = {
  role: string;
  content: string;
};

export type ModelRouterInput = {
  provider?: ModelProvider;
  endpoint?: string;
  apiKey?: string;
  model?: string;
  messages: ChatMessage[];
};

function normalizeProvider(provider?: string): ModelProvider {
  if (provider === "anthropic") return "anthropic";
  if (provider === "gemini") return "gemini";
  if (provider === "mock") return "mock";
  return "openai-compatible";
}

function latestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

export async function routeModelRequest(input: ModelRouterInput) {
  const provider = normalizeProvider(input.provider);

  if (provider === "mock" || !input.endpoint) {
    return {
      provider: "mock",
      model: input.model ?? "mock-model",
      message: "API Worker is running. Configure provider, endpoint, apiKey, and model to call a real model.",
      echo: latestUserMessage(input.messages),
    };
  }

  if (provider === "anthropic") {
    return callAnthropic(input);
  }

  if (provider === "gemini") {
    return callGemini(input);
  }

  return callOpenAICompatible(input);
}

async function callOpenAICompatible(input: ModelRouterInput) {
  const response = await fetch(input.endpoint!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(input.apiKey ? { authorization: `Bearer ${input.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: input.model ?? "gpt-4o-mini",
      messages: input.messages,
      stream: false,
    }),
  });

  return parseResponse(response);
}

async function callAnthropic(input: ModelRouterInput) {
  const systemMessages = input.messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const messages = input.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));

  const response = await fetch(input.endpoint!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      ...(input.apiKey ? { "x-api-key": input.apiKey } : {}),
    },
    body: JSON.stringify({
      model: input.model ?? "claude-3-5-sonnet-latest",
      max_tokens: 4096,
      system: systemMessages || undefined,
      messages,
    }),
  });

  return parseResponse(response);
}

async function callGemini(input: ModelRouterInput) {
  const endpoint = new URL(input.endpoint!);
  if (input.apiKey && !endpoint.searchParams.has("key")) {
    endpoint.searchParams.set("key", input.apiKey);
  }

  const contents = input.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  return parseResponse(response);
}

async function parseResponse(response: Response) {
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}
