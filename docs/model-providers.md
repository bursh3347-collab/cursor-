# Model Providers

这个项目现在支持四种 provider：

```txt
openai-compatible
anthropic
gemini
mock
```

## 1. OpenAI-compatible

适合：

- OpenAI
- DeepSeek
- Qwen / DashScope OpenAI-compatible endpoint
- Groq
- OpenRouter
- 本地 Ollama / LM Studio / vLLM / One API / LiteLLM
- 任何 `/v1/chat/completions` 兼容接口

配置示例：

```txt
Provider: openai-compatible
Model: gpt-4o-mini
Custom API Endpoint: https://api.openai.com/v1/chat/completions
Custom API Key: sk-...
```

DeepSeek 示例：

```txt
Provider: openai-compatible
Model: deepseek-chat
Custom API Endpoint: https://api.deepseek.com/v1/chat/completions
Custom API Key: sk-...
```

本地 Ollama 示例：

```txt
Provider: openai-compatible
Model: llama3.1
Custom API Endpoint: http://localhost:11434/v1/chat/completions
Custom API Key: 留空或填任意值
```

## 2. Anthropic Claude

配置示例：

```txt
Provider: anthropic
Model: claude-3-5-sonnet-latest
Custom API Endpoint: https://api.anthropic.com/v1/messages
Custom API Key: sk-ant-...
```

## 3. Gemini

Gemini endpoint 通常带模型名：

```txt
Provider: gemini
Model: gemini-1.5-pro
Custom API Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
Custom API Key: AIza...
```

## 4. Mock

不接真实模型，只测试 worker 链路：

```txt
Provider: mock
Model: mock-model
Custom API Endpoint: 留空
Custom API Key: 留空
```

## 重要说明

激活码只控制你自己的 AI Worker 是否允许使用。能不能调用某个模型，取决于你配置的 API endpoint 和 API key 是否有权限。

本项目不会破解 Cursor、Claude、OpenAI，也不会绕过任何第三方服务的付费限制。
