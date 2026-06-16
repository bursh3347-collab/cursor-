import { createServer, IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";
import { z } from "zod";
import { createLicense, listLicenses, reportUsage, revokeLicense, verifyLicense } from "./license.js";
import { routeModelRequest, ModelProvider } from "./model-router.js";
import { resolveProviderPool } from "./provider-pool.js";

const port = Number(process.env.PORT ?? 9182);
const proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? "http://127.0.0.1:7993";
const adminToken = process.env.ADMIN_TOKEN ?? "change-me-admin-token";
const workerId = crypto.randomBytes(16).toString("hex");

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

function requireAdmin(req: IncomingMessage) {
  return req.headers.authorization === `Bearer ${adminToken}`;
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
  provider: z.enum(["openai-compatible", "anthropic", "gemini", "mock"]).optional(),
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

const revokeSchema = z.object({ key: z.string().min(1) });

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });

  try {
    const host = req.headers.host ?? `localhost:${port}`;
    const url = new URL(req.url ?? "/", "http://" + host);

    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return sendJson(res, 200, {
        ok: true,
        service: "cursor-style-ai-worker-server",
        version: "1.1.57-compatible",
        workerId,
        proxyUrl,
        providers: ["openai-compatible", "anthropic", "gemini", "mock"],
        serverSidePool: {
          openai: Boolean(process.env.OPENAI_API_KEY),
          anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
          gemini: Boolean(process.env.GEMINI_API_KEY),
          deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        },
      });
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

      const pool = resolveProviderPool({
        provider: body.provider as ModelProvider | undefined,
        endpoint: body.customApiEndpoint,
        apiKey: body.customApiKey,
        model: body.model,
      });

      const result = await routeModelRequest({
        provider: pool.provider,
        endpoint: pool.endpoint,
        apiKey: pool.apiKey,
        model: pool.model,
        messages: body.messages,
      });

      reportUsage({
        licenseKey: body.licenseKey,
        deviceId: body.deviceId,
        creditsUsed: 1,
        action: "ai.chat",
        model: pool.model,
      });
      return sendJson(res, 200, { ok: true, provider: pool.provider, model: pool.model, result });
    }

    if (url.pathname.startsWith("/api/admin/")) {
      if (!requireAdmin(req)) return sendJson(res, 401, { ok: false, error: "UNAUTHORIZED" });

      if (req.method === "POST" && url.pathname === "/api/admin/licenses/create") {
        const body = createKeysSchema.parse(await readJson(req));
        const licenses = Array.from({ length: body.count }, () => createLicense(body));
        return sendJson(res, 200, { ok: true, keys: licenses.map((item) => item.key), licenses });
      }

      if (req.method === "GET" && url.pathname === "/api/admin/licenses/list") {
        return sendJson(res, 200, { ok: true, licenses: listLicenses() });
      }

      if (req.method === "POST" && url.pathname === "/api/admin/licenses/revoke") {
        const body = revokeSchema.parse(await readJson(req));
        const license = revokeLicense(body.key);
        if (!license) return sendJson(res, 404, { ok: false, error: "LICENSE_NOT_FOUND" });
        return sendJson(res, 200, { ok: true, license });
      }
    }

    return sendJson(res, 404, { ok: false, error: "NOT_FOUND" });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

console.log(`upgrading ${crypto.createHash("md5").update(process.cwd()).digest("hex")}`);
console.log(`starting ${workerId}`);
console.log("version: 1.1.57-compatible");
console.log(`HTTPS_PROXY ${proxyUrl}`);

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});
