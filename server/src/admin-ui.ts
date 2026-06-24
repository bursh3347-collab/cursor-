export function renderAdminHtml() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>AI Worker Admin</title>
  <style>
    body{font-family:Inter,system-ui,sans-serif;background:#0b0d12;color:#f5f7fb;margin:0;padding:24px} input,select,button{padding:10px;border-radius:8px;border:1px solid #303647;background:#141824;color:#fff} button{cursor:pointer;background:#79a7ff;color:#07101f;font-weight:700}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.card{border:1px solid #303647;border-radius:16px;padding:16px;background:#111520;margin-top:16px}pre{white-space:pre-wrap;max-height:420px;overflow:auto}.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.muted{color:#9aa4b2}
  </style>
</head>
<body>
  <h1>AI Worker Admin</h1>
  <p class="muted">Generate, list, revoke license keys, and inspect provider pool.</p>
  <div class="card">
    <label>Admin Token</label><br />
    <input id="token" style="width:420px" value="change-me-admin-token" />
  </div>
  <div class="card">
    <h2>Create license keys</h2>
    <div class="grid">
      <select id="plan"><option>trial</option><option selected>monthly</option><option>yearly</option><option>lifetime</option></select>
      <input id="count" value="10" placeholder="count" />
      <input id="days" value="30" placeholder="days" />
      <input id="dailyCreditLimit" value="100" placeholder="daily credit" />
      <input id="maxDevices" value="1" placeholder="max devices" />
      <button onclick="createKeys()">Generate</button>
    </div>
  </div>
  <div class="card row">
    <button onclick="listKeys()">List licenses</button>
    <button onclick="poolStatus()">Pool status</button>
    <input id="revokeKey" placeholder="license key to revoke" style="width:320px" />
    <button onclick="revokeKey()">Revoke</button>
  </div>
  <pre id="out" class="card"></pre>
<script>
const out = document.getElementById('out');
const token = () => document.getElementById('token').value;
async function api(path, options={}) {
  const res = await fetch(path, { ...options, headers: { 'content-type':'application/json', authorization:'Bearer ' + token(), ...(options.headers||{}) } });
  const json = await res.json();
  out.textContent = JSON.stringify(json, null, 2);
  return json;
}
async function createKeys(){
  await api('/api/admin/licenses/create', { method:'POST', body: JSON.stringify({
    plan: document.getElementById('plan').value,
    count: Number(document.getElementById('count').value),
    days: document.getElementById('plan').value === 'lifetime' ? undefined : Number(document.getElementById('days').value),
    dailyCreditLimit: Number(document.getElementById('dailyCreditLimit').value),
    maxDevices: Number(document.getElementById('maxDevices').value),
  }) });
}
async function listKeys(){ await api('/api/admin/licenses/list'); }
async function poolStatus(){ await api('/api/admin/pool/status'); }
async function revokeKey(){ await api('/api/admin/licenses/revoke', { method:'POST', body: JSON.stringify({ key: document.getElementById('revokeKey').value }) }); }
</script>
</body>
</html>`;
}
