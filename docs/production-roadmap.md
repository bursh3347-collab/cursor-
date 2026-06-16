# Production Roadmap

当前项目已经具备：

```txt
- Cursor / VS Code 侧边栏
- 激活码登录
- 持久化 JSON 数据库
- 自动生成激活码
- 禁用激活码
- 设备数限制
- 每日额度限制
- 自定义 API / BYOK
- 服务端模型池环境变量
- OpenAI-compatible / Anthropic / Gemini / Mock 路由
```

## 和你买的插件的差异

它如果输入激活码就能用很多模型，原因通常是卖家后端已经部署了模型池：

```txt
激活码 -> 授权服务器 -> 模型网关 -> 多个模型供应商 key 池
```

本项目现在已经有这个架构入口，但你需要配置自己的合法模型 key：

```txt
OPENAI_API_KEY
ANTHROPIC_API_KEY
GEMINI_API_KEY
DEEPSEEK_API_KEY
```

配置好后，用户只需要激活码，不需要自己填 Custom API Key。

## 仍然不能做的事

```txt
- 不能破解 Cursor / Claude / OpenAI
- 不能伪造第三方会员
- 不能绕过第三方付费限制
- 不能复制别人插件的私有协议和后端
```

## 真正商业化还要补

```txt
1. PostgreSQL / Supabase 替代 JSON 文件
2. 管理后台 UI
3. 支付 webhook 自动发卡
4. 多 key 轮询和失败切换
5. 每模型倍率计费
6. 打包 .vsix 并发布私有插件源
7. 代理协议兼容 Cursor 请求格式
```
