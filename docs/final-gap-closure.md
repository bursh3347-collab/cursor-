# Final Gap Closure

本轮补齐的内容：

```txt
1. 多 API Key 池
2. Key 失败自动冷却和切换
3. 按模型估算 credits
4. 服务端模型池，不需要用户填 API Key
5. OpenAI-compatible 本地代理接口 /v1/chat/completions
6. Admin Web UI：/admin
7. Admin API：生成 / 查看 / 禁用 license
8. 持久化 JSON DB
9. VSIX 打包脚本
```

## 管理后台

启动 server 后打开：

```txt
http://localhost:9182/admin
```

默认 admin token：

```txt
change-me-admin-token
```

正式使用必须修改 `.env`。

## 服务端模型池

`.env` 支持多个 key，用英文逗号隔开：

```txt
OPENAI_API_KEY=sk-1,sk-2,sk-3
ANTHROPIC_API_KEY=sk-ant-1,sk-ant-2
GEMINI_API_KEY=AIza1,AIza2
DEEPSEEK_API_KEY=sk-ds-1,sk-ds-2
```

也支持高级 JSON 池：

```txt
MODEL_POOL_JSON=[{"name":"openrouter-1","provider":"openai-compatible","endpoint":"https://openrouter.ai/api/v1/chat/completions","apiKey":"sk-or-...","models":["*"],"weight":1}]
```

## 本地 OpenAI-compatible 代理

请求：

```txt
POST http://localhost:9182/v1/chat/completions
```

Headers：

```txt
x-license-key: AIW-...
x-device-id: device-001
x-model: gpt-4o-mini
```

Body：

```json
{
  "model": "gpt-4o-mini",
  "messages": [{ "role": "user", "content": "hello" }]
}
```

## 打包插件

```bash
cd vscode-extension
npm install
npm run package
```

生成 `.vsix` 后可在 Cursor / VS Code 里安装。

## 仍然不能承诺的事

不能也不会做：

```txt
- 破解 Cursor 官方会员
- 绕过 Claude / OpenAI / Gemini 付费
- 复制第三方插件私有后端
- 窃取或复用别人 API Key
```

现在这套已经是合法路径下接近同类插件的完整产品骨架。真正能否“所有模型都能用”，取决于你在 `.env` 配置的合法模型 key 池。
