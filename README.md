# ai-script
AI 爆款短视频脚本生成与复刻平台。

## 生产前端

前台用户端：

```bash
cd apps/front-web
npm install
npm run dev
```

后台管理端：

```bash
cd apps/admin-web
npm install
npm run dev
```

前台用户端和后台管理端默认通过 `src/services/mock.js` 模拟后端接口。联调真实后端时设置：

```bash
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 本地演示账号

Mock 模式默认不严格校验密码，但建议统一使用下列账号，和真实后端 seed 数据保持一致。

| 端 | 角色 | 登录账号 | 密码 | 状态 |
| --- | --- | --- | --- | --- |
| 前台用户端 | 演示用户 / 分享人 | `demo@ai-script.local` | `123456` | 启用 |
| 前台用户端 | 协作编导 / 申请人 | `collab@ai-script.local` | `123456` | 启用 |
| 后台管理端 | 超级管理员 | `admin@ai-script.local` | `123456` | 启用 |

登录成功后，前后台接口都会返回 `{ token, user }`：

- 前台保存在 `localStorage.front-session`。
- 后台保存在 `localStorage.admin-session`。
- `token` 当前是后端 MVP Bearer token，格式为 `front:<userId>` 或 `admin:<userId>`，不是标准 JWT。
- 后续真实 API 请求会自动带上 `Authorization: Bearer <token>`，页面展示的用户信息来自返回的 `user`，刷新页面后会调用当前用户接口重新校验。

## 后端服务

FastAPI 后端位于 `server/`，默认连接本机 PostgreSQL 数据库 `ai_script_dev`。

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API 文档：`http://127.0.0.1:8000/docs`

后端支持多个 OpenAI-compatible 大模型供应商。默认从数据库 `api_provider_configs(provider_type='llm')` 读取启用配置，并按 `priority` 自动选择和故障切换；密钥建议用 `env:VAR_NAME` 存引用。

常用方式是在启动环境中配置密钥：

```bash
DEEPSEEK_API_KEY=your-deepseek-key
DASHSCOPE_API_KEY=your-qwen-key
OPENAI_API_KEY=your-openai-key
```

也可以只用单个环境变量 Provider：

```bash
LLM_API_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=your-api-key
LLM_MODEL=deepseek-chat
```

## 设计参考

`ui/ui-front-web/` 和 `ui/ui-admin-web/` 是现有 UI 原型参考，不再作为生产业务前端继续扩展。
