# Quickstart (一次说清楚)

这是你自己的合法版 Cursor-style AI Worker。不是破解，不是复制别人后端。

## A. 启动后端

```cmd
cd C:\Users\Administrator\Desktop\cursor-
run-server.cmd
```

成功标志：

```txt
Server is running on http://localhost:9182/
```

## B. 配置你自己的模型 key（这步决定能不能用模型）

编辑：

```txt
server\.env
```

填你自己合法购买的 key（可多个，逗号隔开）：

```env
OPENAI_API_KEY=sk-xxx,sk-yyy
ANTHROPIC_API_KEY=sk-ant-xxx
GEMINI_API_KEY=AIza-xxx
DEEPSEEK_API_KEY=sk-ds-xxx
```

不填 key = 只能 mock 测试。填了 key = 用户只输激活码就能用模型。

## C. 生成激活码

打开：

```txt
http://localhost:9182/admin
```

Admin Token 默认：

```txt
change-me-admin-token
```

生成后拿到：

```txt
AIW-XXXX-XXXX-XXXX-XXXX-XXXX
```

## D. 安装插件到 Cursor

```cmd
install-extension.cmd
```

失败就手动：

```txt
Cursor → Extensions → ... → Install from VSIX
```

## E. 使用

重启 Cursor → 左侧 AI Worker → USER CENTER

```txt
1. Start Local Server
2. 输入激活码
3. Login
4. 选 Provider / Model
5. Start API Worker
```

## F. 外部客户端调用（OpenAI-compatible）

```txt
POST http://localhost:9182/v1/chat/completions
x-license-key: AIW-...
x-device-id: device-001
x-model: gpt-4o-mini
```

Body：

```json
{ "model": "gpt-4o-mini", "messages": [{ "role": "user", "content": "hi" }] }
```

## 边界

不做：破解 Cursor / 复制别人私有后端 / 盗用别人 key / 绕过付费。
做：你自己的插件 + 你自己的后端 + 你自己的 key 池 + 你自己的激活码。
