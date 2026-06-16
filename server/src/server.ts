import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { createLicense, reportUsage, verifyLicense } from "./license.js";

const port = Number(process.env.PORT ?? 8787);
const adminToken = process.env.ADMIN_TOKEN ?? "change-me-admin-token";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  });
  res.end(JSON.stringify(body, null, 2));
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function proxyAiRequest(args: {
  customApiEndpoint?: string;
  customApiKey?: string;
  messages: Array<{ role: string; content: string }>;
  model?: string;
}) {
  if (!args.customApiEndpoint) {
    return {
      mode: "mock",
      message: "API Worker is running. Configure customApiEndpoint to proxy real model requests.",
      echo: args.messages.at(-1)?.content ?? "",
    };
  }

  const response = await fetch(args.customApiEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(args.customApiKey ? { authorization: `Bearer ${args.customApiKey}` } : {}),
    },
    body: JSON.stringify({
      model: args.model ?? "gpt-4o-mini",
      messages: args.messages,
    }),
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

const activateSchema = z.object({
  licenseKey: z.string().min(1),
  deviceId: z.string().min(1),
});

const usageSchema = z.object({
  licenseKey: z.string().min(1),
  deviceId: z.string().min(1),
  creditsUsed: z.number().positive(),
  action: z.string().default("unknown"),
  model: z.string().optional(),
});

const chatSchema = z.object({
  licenseKey: z.string().min(1),
  deviceId: z.string().min(1),
  messages: z.array(z.object({ role: z.string(), content: z.string() })).min(1),
  model: z.string().optional(),
  customApiEndpoint: z.string().url().optional(),
  customApiKey: z.string().optional(),
});

const createKeysSchema = z.object({
  plan: z.enum(["trial", "monthly", "yearly", "lifetime"]),
  count: z.number().int().min(1).max(500),
  days: z.number().int().min(1).max(3650).optional(),
  dailyCreditLimit: z.number().positive().default(100),
  maxDevices: z.number().int().min(1).max(20).default(1),
});

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });

  try {
    const host = req.headers.host ?? `localhost:${port}`;
    const url = new URL(req.url ?? "/", "http://" + host);

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, service: "cursor-style-ai-worker-server" });
    }

    if (req.method === "POST" && (url.pathname === "/api/license/activate" || url.pathname === "/api/license/verify")) {
      const body = activateSchema.parse(await readJson(req));
      return sendJson(res, 200, verifyLicense(body));
    }

    if (req.method === "POST" && url.pathname === "/api/usage/report") {
      const body = usageSchema.parse(await readJson(req));
      const updated = reportUsage(body);
      if (!updated) return sendJson(res, 404, { ok: false, error: "LICENSE_NOT_FOUND" });
      return sendJson(res, 200, {
        ok: true,
        usedToday: updated.usedToday,
        dailyCreditLimit: updated.dailyCreditLimit,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/ai/chat") {
      const body = chatSchema.parse(await readJson(req));
      const license = verifyLicense({ licenseKey: body.licenseKey, deviceId: body.deviceId });
      if (!license.valid) return sendJson(res, 403, license);

      const result = await proxyAiRequest(body);
      reportUsage({
        licenseKey: body.licenseKey,
        deviceId: body.deviceId,
        creditsUsed: 1,
        action: "ai.chat",
        model: body.model,
      });
      return sendJson(res, 200, { ok: true, result });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/licenses/create") {
      if (req.headers.authorization !== `Bearer ${adminToken}`) {
        return sendJson(res, 401, { ok: false, error: "UNAUTHORIZED" });
      }
      const body = createKeysSchema.parse(await readJson(req));
      const licenses = Array.from({ length: body.count }, () => createLicense(body));
      return sendJson(res, 200, { ok: true, keys: licenses.map((item) => item.key), licenses });
    }

    return sendJson(res, 404, { ok: false, error: "NOT_FOUND" });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, () => {
  console.log(`Cursor-style AI Worker server running at http://localhost:${port}`);
});
