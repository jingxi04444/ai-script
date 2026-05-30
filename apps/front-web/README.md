# Front Web

生产前台用户端。

## 启动

```bash
npm install
npm run dev
```

默认使用 `src/services/mock.js` 模拟后端。切换真实后端：

```bash
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 本地演示账号

| 角色 | 登录账号 | 密码 | 说明 |
| --- | --- | --- | --- |
| 增长编导 | `linnan@ai-script.local` | `123456` | 前台真实后端 seed 账号；Mock 模式建议也使用这个账号。 |

## 登录态

前台登录接口：

```http
POST /api/auth/login
```

请求体：

```json
{ "account": "linnan@ai-script.local", "password": "123456" }
```

返回体：

```json
{ "token": "front:<userId>", "user": { "id": "...", "name": "林楠", "tenantName": "北钥宠物生活", "role": "增长编导", "points": 1280 } }
```

登录成功后保存到 `localStorage.front-session`。后续请求由 `src/services/apiClient.ts` 自动添加：

```http
Authorization: Bearer <token>
```

刷新页面后会调用 `GET /api/auth/me` 校验并刷新用户信息。
