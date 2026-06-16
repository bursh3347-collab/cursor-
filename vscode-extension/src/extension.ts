import * as vscode from "vscode";
import crypto from "node:crypto";

type WorkerConfig = {
  serverUrl: string;
  licenseKey: string;
  deviceId: string;
  customApiEndpoint: string;
  customApiKey: string;
};

const CONFIG_KEY = "aiWorker.config";

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand("aiWorker.openUserCenter", () => {
    const panel = vscode.window.createWebviewPanel(
      "aiWorkerUserCenter",
      "AI Worker User Center",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    const config = getConfig(context);
    panel.webview.html = renderHtml(config);

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "saveConfig") {
        const next = { ...getConfig(context), ...message.config };
        await context.globalState.update(CONFIG_KEY, next);
        panel.webview.postMessage({ type: "configSaved", config: next });
      }

      if (message.type === "login" || message.type === "refresh") {
        const next = { ...getConfig(context), ...message.config };
        await context.globalState.update(CONFIG_KEY, next);
        const status = await verify(next);
        panel.webview.postMessage({ type: "status", status });
      }

      if (message.type === "startWorker") {
        const next = { ...getConfig(context), ...message.config };
        await context.globalState.update(CONFIG_KEY, next);
        const result = await startWorker(next);
        panel.webview.postMessage({ type: "workerStarted", result });
      }
    });
  });

  context.subscriptions.push(command);
}

function getConfig(context: vscode.ExtensionContext): WorkerConfig {
  const saved = context.globalState.get<Partial<WorkerConfig>>(CONFIG_KEY) ?? {};
  return {
    serverUrl: saved.serverUrl ?? "http://localhost:8787",
    licenseKey: saved.licenseKey ?? "",
    deviceId: saved.deviceId ?? createDeviceId(),
    customApiEndpoint: saved.customApiEndpoint ?? "",
    customApiKey: saved.customApiKey ?? "",
  };
}

function createDeviceId() {
  return `device-${crypto.randomUUID().slice(0, 12)}`;
}

async function verify(config: WorkerConfig) {
  const response = await fetch(`${config.serverUrl}/api/license/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ licenseKey: config.licenseKey, deviceId: config.deviceId }),
  });
  return response.json();
}

async function startWorker(config: WorkerConfig) {
  const response = await fetch(`${config.serverUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      licenseKey: config.licenseKey,
      deviceId: config.deviceId,
      customApiEndpoint: config.customApiEndpoint || undefined,
      customApiKey: config.customApiKey || undefined,
      messages: [{ role: "user", content: "Worker health check" }],
    }),
  });
  return response.json();
}

function renderHtml(config: WorkerConfig) {
  const escaped = JSON.stringify(config).replace(/</g, "\\u003c");
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: var(--vscode-font-family); padding: 14px; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    .box { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 14px; margin-bottom: 14px; }
    label { display:block; font-weight:700; margin: 12px 0 6px; }
    input { width: 100%; box-sizing: border-box; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; }
    button { width: 100%; margin-top: 8px; padding: 8px; border: 0; border-radius: 4px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); cursor: pointer; }
    button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .muted { color: var(--vscode-descriptionForeground); }
    .active { color: #69f0ae; font-weight: 700; }
    .expired, .bad { color: #ff6b6b; font-weight: 700; }
    .row { border-bottom: 1px solid var(--vscode-panel-border); padding: 8px 0; }
    code { user-select: all; }
  </style>
</head>
<body>
  <h3>USER CENTER</h3>
  <div class="box">
    <div class="muted">Extension Version:</div>
    <strong>0.1.0</strong>
    <div class="muted" style="margin-top:8px">API Worker:</div>
    <code id="serverUrlText"></code>
  </div>

  <h3>Activation Login</h3>
  <input id="licenseKey" placeholder="Enter activation code" />
  <button id="login">Login</button>

  <div class="row"><strong>用户ID:</strong><br/><span id="userId" class="muted">None</span></div>
  <div class="row"><strong>Activation Code:</strong><br/><span id="activationCode" class="muted">None</span></div>
  <div class="row"><strong>Membership Status:</strong><br/><span id="membershipStatus" class="expired">Not logged in</span></div>
  <div class="row"><strong>Expiry Time:</strong><br/><span id="expiryTime" class="muted">None</span></div>
  <div class="row"><strong>Today's used credits:</strong><br/><span id="usedToday">0</span></div>

  <button id="refresh" class="secondary">Refresh Status</button>

  <h3>Config Custom API</h3>
  <label>Server URL</label>
  <input id="serverUrl" />
  <label>Custom API Endpoint</label>
  <input id="customApiEndpoint" placeholder="https://api.example.com/v1/chat/completions" />
  <label>Custom API Key</label>
  <input id="customApiKey" type="password" placeholder="sk-..." />
  <button id="save" class="secondary">Save Config</button>
  <button id="start">Start API Worker</button>

  <pre id="log" class="box muted"></pre>

  <script>
    const vscode = acquireVsCodeApi();
    const config = ${escaped};
    const $ = (id) => document.getElementById(id);

    function fillConfig(next) {
      $('serverUrl').value = next.serverUrl || 'http://localhost:8787';
      $('serverUrlText').textContent = next.serverUrl || 'http://localhost:8787';
      $('licenseKey').value = next.licenseKey || '';
      $('customApiEndpoint').value = next.customApiEndpoint || '';
      $('customApiKey').value = next.customApiKey || '';
    }

    function collectConfig() {
      return {
        serverUrl: $('serverUrl').value,
        licenseKey: $('licenseKey').value,
        customApiEndpoint: $('customApiEndpoint').value,
        customApiKey: $('customApiKey').value,
      };
    }

    function renderStatus(status) {
      $('userId').textContent = status.userId || 'None';
      $('activationCode').textContent = status.activationCode || $('licenseKey').value || 'None';
      $('membershipStatus').textContent = status.membershipStatus || 'Unknown';
      $('membershipStatus').className = status.valid ? 'active' : 'expired';
      $('expiryTime').textContent = status.expiryTime || 'None';
      $('usedToday').textContent = status.usedToday ?? 0;
      $('log').textContent = JSON.stringify(status, null, 2);
    }

    fillConfig(config);

    $('save').onclick = () => vscode.postMessage({ type: 'saveConfig', config: collectConfig() });
    $('login').onclick = () => vscode.postMessage({ type: 'login', config: collectConfig() });
    $('refresh').onclick = () => vscode.postMessage({ type: 'refresh', config: collectConfig() });
    $('start').onclick = () => vscode.postMessage({ type: 'startWorker', config: collectConfig() });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'configSaved') {
        fillConfig(message.config);
        $('log').textContent = 'Config saved.';
      }
      if (message.type === 'status') renderStatus(message.status);
      if (message.type === 'workerStarted') $('log').textContent = JSON.stringify(message.result, null, 2);
    });
  </script>
</body>
</html>`;
}

export function deactivate() {}
