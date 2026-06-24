# Architecture

## 目标

做一个合法的 Cursor 风格 AI Worker：

```txt
Cursor / VS Code Extension
→ License Server
→ API Worker
→ Your API Key / BYOK / Local Model
```

## 非目标

不做：

- 破解 Cursor
- 绕过 Claude / OpenAI / Cursor 付费限制
- 盗用第三方 API Key
- 批量注册滥用免费额度
- 伪装官方服务

## 模块

### 1. VS Code Extension

负责：

- Webview 用户中心
- 激活码输入
- 本地保存配置
- 调用授权服务器
- 启动 API Worker

### 2. License Server

负责：

- 激活码验证
- 设备绑定
- 到期时间判断
- 每日额度统计
- 管理员生成激活码

### 3. API Worker

负责：

- 请求前验证 license
- 检查今日额度
- 转发到自定义模型 API
- 上报 usage
- 隐藏服务端 API Key

## 数据模型

```ts
type License = {
  key: string;
  userId: string;
  plan: "trial" | "monthly" | "yearly" | "lifetime";
  status: "active" | "expired" | "revoked";
  expiresAt: string | null;
  dailyCreditLimit: number;
  usedToday: number;
  maxDevices: number;
  devices: string[];
};
```

## 安全原则

- 用户 API Key 不写入仓库
- 服务端 API Key 只在服务器环境变量
- 发帖、merge、删除文件等高风险动作必须人工确认
- 默认 BYOK / 自带 API，不承诺无限免费量
