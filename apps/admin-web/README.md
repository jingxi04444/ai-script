# Admin Web

生产后台管理前端，基于 `ui/ui-admin-web` 原型实现，代码按职责分层：

- `src/app/`: 应用壳、路由、登录 session、主题和布局。
- `src/pages/`: 后台路由页面。
- `src/services/`: API client、业务 API service 和 `mock.js`。
- `src/types/`: 请求参数、返回结构和业务类型。
- `src/components/`: 跨页面复用组件。

## 启动

```bash
npm install
npm run dev
```

默认使用 `src/services/mock.js` 模拟后端。

切换真实后端：

```bash
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 本地演示账号

Mock 模式默认不严格校验密码，但建议统一使用下列账号，和真实后端 seed 数据保持一致。

| 角色 | 登录账号 | 密码 | 状态 |
| --- | --- | --- | --- |
| 超级管理员 | `admin@ai-script.local` | `123456` | 启用 |
| 品牌管理员 | `tangyu@ai-script.local` | `123456` | 启用 |
| 审核员 | `zhounan@ai-script.local` | `123456` | 停用，不能登录 |

## 登录态

后台登录接口：

```http
POST /api/admin/auth/login
```

请求体：

```json
{ "account": "admin@ai-script.local", "password": "123456", "rememberMe": true }
```

返回体：

```json
{ "token": "admin:<userId>", "user": { "id": "...", "name": "系统管理员", "role": "超级管理员", "tenantScope": "全部品牌", "permissions": ["..."] } }
```

登录成功后保存到 `localStorage.admin-session`。后续请求由 `src/services/apiClient.ts` 自动添加：

```http
Authorization: Bearer <token>
```

刷新页面后会调用 `GET /api/admin/auth/current-user` 校验并刷新用户信息。

当前后端 MVP token 格式为 `front:<userId>` 或 `admin:<userId>`，不是标准 JWT；如果后续替换成标准 JWT，前端只依赖 `token` 字段，不需要改页面层。

## API 对接

所有页面只调用 `src/services/*Api.ts`，不直接 import `mock.js`。真实后端联调只需要切换环境变量。

主要接口：

| 模块 | 方法 | 路径 | 请求参数类型 | 返回类型 |
| --- | --- | --- | --- | --- |
| 登录 | `POST` | `/api/admin/auth/login` | `LoginRequest` | `AuthResult` |
| 当前用户 | `GET` | `/api/admin/auth/current-user` | none | `AdminUser` |
| 动态菜单 | `GET` | `/api/admin/menus` | none | `AdminMenuItem[]` |
| 数据概览 | `GET` | `/api/admin/dashboard/overview` | none | `DashboardOverview` |
| API Provider | `GET` | `/api/admin/api-providers` | query | `ApiProvider[]` |
| 新增 Provider | `POST` | `/api/admin/api-providers` | `CreateApiProviderRequest` | `ApiProvider` |
| 更新 Provider 状态 | `PATCH` | `/api/admin/api-providers/{id}/status` | `{ status }` | `ApiProvider` |
| 解析 Provider | `GET` | `/api/admin/parse-providers` | none | `ParseProvider[]` |
| 接口契约 | `GET` | `/api/admin/api-contracts` | none | `ApiContract[]` |
| 提示词模板 | `GET` | `/api/admin/prompt-templates` | none | `PromptTemplate[]` |
| 更新提示词模板 | `PATCH` | `/api/admin/prompt-templates/{id}` | `UpdatePromptTemplateRequest` | `PromptTemplate` |
| 知识库 | `GET` | `/api/admin/knowledge-base` | `KnowledgeQuery` | `KnowledgeBaseData` |
| 审核总览 | `GET` | `/api/admin/audit/overview` | none | `AuditOverview` |
| 提交审核 | `POST` | `/api/admin/audit/tasks/{taskId}/review` | `ReviewTaskRequest` | `{ success: boolean }` |
| 项目列表 | `GET` | `/api/admin/projects` | `ProjectQuery` | `AdminProject[]` |
| 用户列表 | `GET` | `/api/admin/users` | query | `ManagedUser[]` |
| 新增用户 | `POST` | `/api/admin/users` | `CreateUserRequest` | `ManagedUser` |
| 更新用户状态 | `POST` | `/api/admin/users/{id}/enable` 或 `/api/admin/users/{id}/disable` | none | `ManagedUser` |
| 角色权限 | `GET` | `/api/admin/roles` | none | `RolePermission[]` |
| 操作日志 | `GET` | `/api/admin/operation-logs` | `OperationLogQuery` | `PagedResult<OperationLog>` |

列表接口可返回数组，也可返回 `{ "list": [...] }` 或 `{ "data": [...] }`，`apiClient.requestList` 会做兼容适配。

请求/响应类型定义集中在 `src/types/admin.ts`。
