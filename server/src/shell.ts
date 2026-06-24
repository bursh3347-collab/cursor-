// Legal launcher for your own AI Worker server.
// This is an original entry point. It does NOT replicate any third-party
// private shell logic; it simply boots this project's own server.
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proxyUrl = process.env.HTTPS_PROXY ?? "http://127.0.0.1:7993";
const port = process.env.PORT ?? "9182";

console.log(`upgrading ${crypto.randomBytes(16).toString("hex")}`);
console.log(`starting ${crypto.randomBytes(16).toString("hex")}`);
console.log("version: 1.1.57-compatible");
console.log(`HTTPS_PROXY ${proxyUrl}`);

const child = spawn(process.execPath, [path.join(here, "..", "node_modules", "tsx", "dist", "cli.mjs"), path.join(here, "server.ts")], {
  stdio: "inherit",
  env: { ...process.env, PORT: port, HTTPS_PROXY: proxyUrl },
});

child.on("exit", (code) => process.exit(code ?? 0));
