# License Admin

这个文档说明如何给你自己的 AI Worker 自动生成激活码。

## 重要边界

激活码只解锁你自己的 Worker：

```txt
你的插件
→ 你的授权服务器
→ 你自己的模型 API / 用户自带 API / 本地模型
```

它不能凭空生成 Cursor、Claude、OpenAI、Gemini 的免费额度，也不能绕过第三方服务的付费限制。

## 启动 server

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

默认管理 token 在 `.env`：

```txt
ADMIN_TOKEN=change-me-admin-token
```

正式使用时一定要改成随机长字符串。

## 生成 10 个月卡

另开一个终端：

```bash
cd server
npm run generate-keys -- --plan monthly --count 10 --days 30 --daily-credit-limit 100 --max-devices 1
```

输出类似：

```txt
Generated license keys:
AIW-ABCD-1234-EF56-7890-AABB
AIW-00AA-11BB-22CC-33DD-44EE
```

这些 key 可以直接填到插件的 Activation Code。

## 生成日卡

```bash
npm run generate-keys -- --plan trial --count 100 --days 1 --daily-credit-limit 30 --max-devices 1
```

## 生成周卡

```bash
npm run generate-keys -- --plan trial --count 100 --days 7 --daily-credit-limit 80 --max-devices 1
```

## 生成年卡

```bash
npm run generate-keys -- --plan yearly --count 50 --days 365 --daily-credit-limit 500 --max-devices 3
```

## 生成永久卡

```bash
npm run generate-keys -- --plan lifetime --count 20 --daily-credit-limit 1000 --max-devices 5
```

## 直接用 API 生成

```bash
curl -X POST http://localhost:9182/api/admin/licenses/create \
  -H "content-type: application/json" \
  -H "authorization: Bearer change-me-admin-token" \
  -d '{
    "plan": "monthly",
    "count": 10,
    "days": 30,
    "dailyCreditLimit": 100,
    "maxDevices": 1
  }'
```

## 生产环境注意

当前 MVP 使用内存数据库，server 重启后新生成的 key 会丢失。正式卖卡前必须接 PostgreSQL / Supabase / SQLite 持久化。

下一步应补：

```txt
1. 数据库持久化
2. 管理后台
3. 发卡记录导出 CSV
4. 支付 webhook 自动发卡
5. key 启用 / 禁用 / 延期 / 查用量
```
