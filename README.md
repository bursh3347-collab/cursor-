# Cursor-style AI Worker

这是一个合法版的 Cursor / VS Code 侧边栏 AI Worker 脚手架：

- VS Code / Cursor 插件侧边栏
- 激活码登录
- 会员状态 / 到期时间 / 今日额度显示
- 自定义 API Endpoint / API Key 配置
- 本地授权服务器
- API Worker 代理层
- 用量上报
- 管理员批量生成激活码

> 重要：这个项目不破解 Cursor、Claude、OpenAI 或任何第三方服务，也不绕过付费限制。它做的是你自己的插件 + 你自己的授权系统 + 你自己的 API/BYOK/本地模型入口。

## 目录

```txt
.
├── server/              # 授权服务器 + API Worker
├── vscode-extension/    # Cursor / VS Code 插件
└── docs/                # 说明文档
```

## 快速启动

### 1. 启动授权服务器

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

默认地址：

```txt
http://localhost:8787
```

内置测试激活码：

```txt
DEV-TEST-ACTIVE-KEY
DEV-TEST-EXPIRED-KEY
```

### 2. 启动插件开发环境

```bash
cd vscode-extension
npm install
npm run compile
```

然后在 VS Code / Cursor 里按 `F5`，打开 Extension Development Host。

命令面板运行：

```txt
Open AI Worker User Center
```

## 当前 MVP 功能

- 输入激活码 Login
- Refresh Status
- 显示 User ID / Activation Code / Membership Status / Expiry Time / Today's used credits
- 配置 Custom API
- Start API Worker
- 后端验证 license 后再代理 AI 请求

## 后续可以接

- PostgreSQL / Supabase 持久化
- Stripe / Lemon Squeezy / 发卡平台
- OpenAI-compatible API
- Claude / Gemini / 本地模型
- GitHub MCP / 文件系统 Agent
- 额度计费面板
