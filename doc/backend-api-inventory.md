# 后端接口实现状态与测试参数清单

> 梳理范围：`server/src/main/java/com/aiscript/modules/**/controller`，日期：2026-06-20。
> 公共返回格式：非下载接口统一返回 `R<T>`；文件导出/下载按文件流返回。

## 一、已补齐闭环但仍依赖外部配置的接口

| 接口 | 当前状态 | 影响 |
| --- | --- | --- |
| `POST /api/briefs/import` | 已解析 Excel 首行表头并写入 `ai_brief`、`ai_brief_version` | 文件必须包含 `projectId/项目ID` 列 |
| `GET /api/storyboards/{id}/export` | 已按脚本当前版本查询真实分镜并导出 CSV | `{id}` 为脚本 ID |
| `POST /api/compliance/originality` | 已基于脚本版本、来源分析、爆款资产做本地相似度检测并落库 | 属于本地文本相似度，不是第三方全网查重 |
| `POST /api/video/share-url/parse` | 已支持 `video_parse` Provider；未配置时降级保存 URL 元数据 | 真实抓取标题/封面/作者依赖 Provider |
| `POST /api/script-generator/extract-copy` | 传 `text` 直接保存；只传 `videoUrl` 时调用 `asr` Provider | 未配置 ASR Provider 时返回业务错误 |
| `POST /api/payments/recharge` | 已创建订单并返回支付参数 | 当前默认支付客户端返回本地支付参数；真实支付需替换 Provider/Client |
| `POST /api/payments/member-order` | 已校验会员套餐、创建订单并返回支付参数 | 当前默认支付客户端返回本地支付参数 |
| `GET /api/admin/dashboard/summary` | `videoCount` 已按视频素材和视频生成任务统计 | 统计口径：`ai_asset.asset_type=video` + 视频生成类任务 |
| `POST /api/auth/logout`、`POST /api/admin/auth/logout` | 已加入 JWT 黑名单，登出后当前 token 失效 | 当前黑名单为进程内存，重启后清空 |
| `POST /api/scripts/generate` | 有落库、任务和版本记录；调用 `script_generate` Prompt 和 LLM Provider | 未配置 LLM Provider 时返回业务错误 |
| `POST /api/files/upload` | 已接 MinIO/OSS 客户端；依赖存储配置可用 | 环境未配好会失败，不是纯本地模拟 |

## 二、公共测试约定

### 认证

- 放行接口：`/api/auth/**`、`/api/admin/auth/**`、Swagger、health。
- 其他接口通常需要请求头：`Authorization: Bearer <token>`。
- 前台登录：`POST /api/auth/login`。
- 后台登录：`POST /api/admin/auth/login`。

### 公共分页参数

用于所有 `PageQuery` 或其子类接口：

```json
{
  "page": 1,
  "pageSize": 10,
  "keyword": "可选关键词"
}
```

查询串示例：`?page=1&pageSize=10&keyword=脚本`。

### 常用占位 ID

后端 Controller 接收路径 ID 多为 `Long`，前端按规范用字符串；接口测试里路径可直接放数字字符串：

- `{id}`：`1871234567890123456`
- `{projectId}`：`1871234567890123001`
- `{scriptId}`：`1871234567890123002`
- `{scriptVersionId}`：`1871234567890123003`

## 三、全量接口清单与测试参数

### Auth 认证

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | 已实现 | Body: `{"username":"user","password":"123456"}` |
| `POST` | `/api/auth/register` | 已实现 | Body: `{"username":"new_user","password":"123456","email":"u@example.com","phone":"13800000000","code":"123456"}` |
| `POST` | `/api/auth/send-code` | 已实现，依赖短信 Provider | Body: `{"phone":"13800000000"}` |
| `POST` | `/api/auth/logout` | 已实现 token 失效 | Header: `Authorization` |
| `GET` | `/api/auth/user-info` | 已实现 | Header: `Authorization` |
| `POST` | `/api/admin/auth/login` | 已实现 | Body: `{"username":"admin","password":"123456"}` |
| `POST` | `/api/admin/auth/logout` | 已实现 token 失效 | Header: `Authorization` |
| `GET` | `/api/admin/auth/admin-info` | 已实现 | Header: `Authorization` |

### Project 项目

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/projects` | 已实现 | Query: `page,pageSize,keyword,status` |
| `GET` | `/api/projects/{id}` | 已实现 | Path: `id` |
| `POST` | `/api/projects` | 已实现 | Body: `{"name":"夏季新品短视频","category":"美妆","productName":"保湿精华","platform":"douyin","videoRatio":"9:16","videoType":"种草"}` |
| `PUT` | `/api/projects/{id}` | 已实现 | Path: `id`; Body: `{"name":"夏季新品短视频-改","category":"美妆","productName":"保湿精华","platform":"douyin","videoRatio":"9:16","videoType":"种草","status":"draft","currentStep":"brief"}` |
| `DELETE` | `/api/projects/{id}` | 已实现 | Path: `id` |
| `GET` | `/api/admin/projects` | 已实现 | Query: `page,pageSize,keyword,status` |
| `GET` | `/api/admin/projects/{id}` | 已实现 | Path: `id` |
| `DELETE` | `/api/admin/projects/{id}` | 已实现 | Path: `id` |

### Brief 产品 Brief

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/briefs` | 已实现 | Query: `projectId` |
| `GET` | `/api/briefs/{id}` | 已实现 | Path: `id` |
| `POST` | `/api/briefs` | 已实现 | Body: `{"projectId":"1871234567890123001","name":"保湿精华Brief","productName":"保湿精华","productModel":"30ml","primarySellingPoint":"快速补水","targetAudience":"25-35岁女性","targetScene":"通勤前护肤","otherRequirements":"突出清爽不油","briefContent":"主打轻薄补水"}` |
| `PUT` | `/api/briefs/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/briefs/{id}` | 已实现 | Path: `id` |
| `POST` | `/api/briefs/import` | 已实现 | FormData: `file=@brief.xlsx`；表头示例：`项目ID,Brief名称,产品名称,产品型号,主卖点,目标人群,目标场景,其他要求,Brief内容` |

### Script 脚本与模板

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/scripts` | 已实现 | Query: `projectId` |
| `GET` | `/api/scripts/{id}` | 已实现 | Path: `id` |
| `POST` | `/api/scripts/generate` | 部分实现 | Body: `{"projectId":"1871234567890123001","type":"original","templateId":"1871234567890123101","referenceUrl":"https://example.com/video","prompt":"生成30秒种草脚本","duration":"30","format":"口播+分镜"}` |
| `PUT` | `/api/scripts/{id}` | 已实现 | Path: `id`; Body: `{"name":"脚本A","projectId":"1871234567890123001","type":"original","status":"draft","content":"第一版脚本文案"}` |
| `DELETE` | `/api/scripts/{id}` | 已实现 | Path: `id` |
| `GET` | `/api/scripts/templates` | 已实现 | 无参数 |
| `GET` | `/api/admin/templates` | 已实现 | Query: `page,pageSize,keyword` |
| `GET` | `/api/admin/templates/{id}` | 已实现 | Path: `id` |
| `POST` | `/api/admin/templates` | 已实现 | Body: `{"name":"痛点种草模板","category":"种草","actor":"达人","people":"单人","popularity":"high","difficulty":"medium","status":"enabled"}` |
| `PUT` | `/api/admin/templates/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/admin/templates/{id}` | 已实现 | Path: `id` |

### Storyboard 分镜

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/storyboards` | 已实现 | Query: `scriptId` |
| `GET` | `/api/storyboards/{id}` | 已实现 | Path: `id` |
| `PUT` | `/api/storyboards/{id}` | 已实现 | Path: `id`; Body: `{"scriptId":"1871234567890123002","shots":[{"id":"1871234567890124001","shotNo":1,"shotType":"特写","sceneDescription":"产品开场","lineText":"快速补水","durationSeconds":3,"sellingPointNote":"补水","riskLevel":"low","sortOrder":1}]}` |
| `GET` | `/api/storyboards/{id}/export` | 已实现 | Path: `id` |

### Asset 素材与资产

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/assets` | 已实现 | Query: `page,pageSize,keyword,projectId,type` |
| `POST` | `/api/assets` | 已实现 | Body: `{"projectId":"1871234567890123001","name":"产品图","type":"image","category":"product","storageKey":"assets/a.jpg","previewUrl":"https://example.com/a.jpg","mimeType":"image/jpeg","fileSizeBytes":1024,"metadataJson":"{}"}` |
| `PUT` | `/api/assets/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/assets/{id}` | 已实现 | Path: `id` |
| `GET` | `/api/selling-point-assets` | 已实现 | Query: `page,pageSize,keyword` |
| `POST` | `/api/selling-point-assets` | 已实现 | Body: `{"name":"补水卖点","tagText":"补水","mainPoint":"快速吸收","targetAudience":"干皮人群"}` |
| `PUT` | `/api/selling-point-assets/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/selling-point-assets/{id}` | 已实现 | Path: `id` |
| `GET` | `/api/viral-assets` | 已实现 | Query: `page,pageSize,keyword,kind` |
| `POST` | `/api/viral-assets` | 已实现 | Body: `{"name":"爆款脚本A","kind":"script","platform":"douyin","sourceUrl":"https://example.com/video","scriptText":"爆款文案","structureFormula":"痛点-卖点-转化","tagsJson":"[\"美妆\"]"}` |
| `PUT` | `/api/viral-assets/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/viral-assets/{id}` | 已实现 | Path: `id` |
| `POST` | `/api/files/upload` | 已实现，依赖存储配置 | FormData: `file=@demo.jpg`, `folder=assets` |

### Source Analysis 爆款解析/文案提取

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/source-analysis` | 已实现 | Query: `projectId` |
| `POST` | `/api/video/share-url/parse` | 已实现，真实解析依赖 Provider | Body: `{"projectId":"1871234567890123001","url":"https://www.douyin.com/video/123","mode":"viral"}` |
| `POST` | `/api/script-generator/extract-copy` | 已实现，视频转写依赖 ASR Provider | Body: `{"projectId":"1871234567890123001","videoUrl":"https://example.com/video.mp4","text":"这里是手动粘贴的文案"}` |

### Compliance 合规

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `POST` | `/api/compliance/check` | 已实现 | Body: `{"scriptVersionId":"1871234567890123003","content":"这里是一段需要检查的脚本文案"}` |
| `POST` | `/api/compliance/originality` | 已实现 | Body: `{"scriptVersionId":"1871234567890123003","content":"这里是一段需要检查原创度的脚本文案"}` |
| `GET` | `/api/admin/compliance/words` | 已实现 | Query: `page,pageSize,keyword` |
| `POST` | `/api/admin/compliance/words` | 已实现 | Body: `{"wordText":"绝对有效","category":"广告法","riskLevel":"high","suggestion":"改为效果因人而异"}` |
| `PUT` | `/api/admin/compliance/words/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/admin/compliance/words/{id}` | 已实现 | Path: `id` |

### Audit Flow 审核

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `POST` | `/api/audit/tasks` | 已实现 | Body: `{"scriptId":"1871234567890123002","riskSummary":"命中高风险词，需人工复核"}` |
| `GET` | `/api/admin/audit/tasks` | 已实现 | Query: `page,pageSize,keyword,status` |
| `POST` | `/api/admin/audit/tasks/{id}/approve` | 已实现 | Path: `id`; Body: `{"comment":"通过","assigneeId":"1000000000000000101"}` |
| `POST` | `/api/admin/audit/tasks/{id}/reject` | 已实现 | Path: `id`; Body: `{"comment":"请修改夸张表达","assigneeId":"1000000000000000101"}` |

### Generation Task 异步任务

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/tasks/{id}` | 已实现 | Path: `id` |

### Membership 会员

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/membership/plans` | 已实现 | 无参数 |

### Payment 支付

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `POST` | `/api/payments/recharge` | 已实现 | Body: `{"payMethod":"wechat","amount":99.00}` |
| `POST` | `/api/payments/member-order` | 已实现 | Body: `{"planId":"1871234567890123301","payMethod":"alipay","amount":199.00}` |

### Notification 通知

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | 已实现 | Query: `page,pageSize,keyword,status` |
| `POST` | `/api/notifications/{id}/read` | 已实现 | Path: `id` |
| `GET` | `/api/admin/notifications` | 已实现 | Query: `page,pageSize,keyword,status` |
| `POST` | `/api/admin/notifications` | 已实现 | Body: `{"userIds":["1000000000000000102"],"channel":"system","title":"测试通知","content":"这是一条测试通知"}` |

### Admin 用户与仪表盘

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users` | 已实现 | Query: `page,pageSize,keyword,status` |
| `GET` | `/api/admin/users/{id}` | 已实现 | Path: `id` |
| `PUT` | `/api/admin/users/{id}` | 已实现 | Path: `id`; Body: `{"username":"user","email":"u@example.com","phone":"13800000000","memberLevel":1,"balance":100.00,"status":"enabled"}` |
| `POST` | `/api/admin/users/{id}/disable` | 已实现 | Path: `id` |
| `POST` | `/api/admin/users/{id}/enable` | 已实现 | Path: `id` |
| `GET` | `/api/admin/dashboard/summary` | 已实现 | 无参数 |

### System 系统管理

#### 大模型与 Prompt 约定

- 大模型、ASR、TTS、视频生成、视频解析等第三方能力统一使用 `sys_api_provider_config`，管理接口为 `/api/admin/providers`。
- LLM Provider 的 `providerType` 使用 `llm`，`endpointUrl` 存 OpenAI-compatible chat completions URL，`apiKey` 保存时会加密入库，`configJson` 可存模型名、temperature 等。
- Prompt 模板统一使用系统设置里的 `sys_prompt_template`，管理接口为 `/api/admin/system/prompt-templates`。
- 当前已接入模板场景：
  - `script_generate`：脚本生成。
  - `brief_optimize`：Brief 优化。
  - `brief_score`：Brief 评分。
- Prompt 支持变量占位：`{{prompt}}`、`${prompt}`、`{{briefContent}}` 等。

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/admin/providers` | 已实现 | Query: `page,pageSize,keyword,providerType` |
| `POST` | `/api/admin/providers` | 已实现 | Body: `{"providerType":"llm","providerName":"OpenAI兼容","platform":"openai","endpointUrl":"https://api.example.com/v1/chat/completions","apiKey":"sk-test","priority":1,"timeoutMs":8000,"retryCount":1,"configJson":"{\"model\":\"gpt-4o-mini\"}","status":1}` |
| `PUT` | `/api/admin/providers/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/admin/providers/{id}` | 已实现 | Path: `id` |
| `GET` | `/api/admin/system/prompt-templates` | 已实现 | Query: `page,pageSize,keyword,sceneCode` |
| `POST` | `/api/admin/system/prompt-templates` | 已实现 | Body: `{"providerId":"1871234567890123401","sceneCode":"script_generate","templateName":"脚本生成","versionNo":"v1","systemPrompt":"你是短视频编导","userPrompt":"根据Brief生成脚本","responseSchema":"{}","status":1}` |
| `PUT` | `/api/admin/system/prompt-templates/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/admin/system/prompt-templates/{id}` | 已实现 | Path: `id` |
| `GET` | `/api/admin/system/import-templates` | 已实现 | Query: `page,pageSize,keyword,templateType` |
| `POST` | `/api/admin/system/import-templates` | 已实现 | Body: `{"templateType":"brief","templateName":"Brief导入模板","downloadFileName":"brief.xlsx","columnsJson":"[]","sampleRowsJson":"[]","description":"用于导入Brief","status":1}` |
| `PUT` | `/api/admin/system/import-templates/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/admin/system/import-templates/{id}` | 已实现 | Path: `id` |
| `GET` | `/api/admin/system/roles` | 已实现 | Query: `page,pageSize,keyword` |
| `POST` | `/api/admin/system/roles` | 已实现 | Body: `{"roleName":"运营管理员","roleCode":"operator","description":"运营后台权限","status":1}` |
| `PUT` | `/api/admin/system/roles/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/admin/system/roles/{id}` | 已实现 | Path: `id` |
| `PUT` | `/api/admin/system/roles/{id}/permissions` | 已实现 | Path: `id`; Body: `{"permissionIds":["1871234567890123501","1871234567890123502"]}` |
| `PUT` | `/api/admin/system/users/{id}/roles` | 已实现 | Path: `id`; Body: `{"roleIds":["1871234567890123601"]}` |
| `GET` | `/api/admin/system/permissions` | 已实现 | Query: `moduleCode` |
| `POST` | `/api/admin/system/permissions` | 已实现 | Body: `{"permissionName":"项目列表","permissionCode":"project:list","moduleCode":"project","permissionType":"api","path":"/api/admin/projects","parentId":"0","icon":"folder","sortOrder":1,"status":1}` |
| `PUT` | `/api/admin/system/permissions/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/admin/system/permissions/{id}` | 已实现 | Path: `id` |
| `GET` | `/api/admin/operation-logs` | 已实现 | Query: `page,pageSize,keyword,moduleCode,resultStatus` |

### Tenant 租户管理

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/admin/tenants` | 已实现 | Query: `page,pageSize,keyword,status` |
| `GET` | `/api/admin/tenants/{id}` | 已实现 | Path: `id` |
| `POST` | `/api/admin/tenants` | 已实现 | Body: `{"tenantName":"示例品牌","tenantCode":"demo","contactName":"张三","contactPhone":"13800000000","contactEmail":"demo@example.com","domain":"demo.example.com","logoUrl":"https://example.com/logo.png","themeKey":"default","status":1,"planCode":"standard","storageQuotaBytes":1073741824}` |
| `PUT` | `/api/admin/tenants/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `DELETE` | `/api/admin/tenants/{id}` | 已实现 | Path: `id` |

### Project Steps 工作流步骤

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/projects/{projectId}/steps` | 已实现 | Path: `projectId` |
| `POST` | `/api/projects/{projectId}/steps` | 已实现 | Path: `projectId`; Body: `{"stepCode":"brief","stepName":"产品Brief","status":"doing","draftData":"{}"}` |
| `PUT` | `/api/projects/{projectId}/steps/{id}` | 已实现 | Path: `projectId,id`; Body 同创建 |
| `POST` | `/api/projects/{projectId}/steps/{id}/complete` | 已实现 | Path: `projectId,id` |
| `POST` | `/api/projects/{projectId}/steps/{id}/reopen` | 已实现 | Path: `projectId,id` |

### Brief AI

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `POST` | `/api/briefs/{briefId}/ai/optimize` | 已实现，依赖 `brief_optimize` Prompt 和 LLM Provider | Path: `briefId` |
| `POST` | `/api/briefs/{briefId}/ai/score` | 已实现，依赖 `brief_score` Prompt 和 LLM Provider | Path: `briefId` |

### Production 视频生产/配音/导出

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `POST` | `/api/generation/videos` | 已实现基础任务落库 | Body: `{"projectId":"1871234567890123001","shotId":"1871234567890124001","prompt":"生成产品展示视频","tagsJson":"[\"product\"]","durationSeconds":5}` |
| `POST` | `/api/generation/dubbing` | 已实现基础任务落库 | Body: `{"projectId":"1871234567890123001","text":"快速补水","mode":"tts","voice":"female","speed":"normal","tone":"friendly","volume":"medium","lipPrecision":"standard"}` |
| `GET` | `/api/projects/{projectId}/timeline` | 已实现 | Path: `projectId` |
| `PUT` | `/api/projects/timeline` | 已实现 | Body: `{"projectId":"1871234567890123001","selectedClip":"main","transitionEffect":"fade","backgroundMusicAssetId":"1871234567890125001","resolution":"1080P","configJson":"{}"}` |
| `POST` | `/api/exports` | 已实现基础任务落库 | Body: `{"projectId":"1871234567890123001","exportType":"video","resolution":"1080P","fileName":"demo.mp4"}` |
| `GET` | `/api/exports` | 已实现 | Query: `page,pageSize,projectId` |

### Wallet / Quota 钱包与额度

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `POST` | `/api/payments/recharge-orders` | 已实现真实支付下单 | Body: `{"amount":100,"payMethod":"wechat"}` 或 `{"amount":100,"payMethod":"alipay"}` |
| `POST` | `/api/payments/member-orders` | 已实现会员下单/余额支付 | Body: `{"planId":"1","payMethod":"wechat"}` / `alipay` / `balance` |
| `GET` | `/api/payments/orders` | 已实现前台用户订单分页列表 | Query: `page,pageSize,keyword,status` |
| `GET` | `/api/payments/orders/{orderNo}` | 已实现订单状态查询 | Path: `orderNo` |
| `POST` | `/api/payments/orders/{orderNo}/query-provider` | 已实现三方查单补偿 | Path: `orderNo` |
| `POST` | `/api/payments/orders/{orderNo}/close` | 已实现关闭未支付订单 | Path: `orderNo` |
| `POST` | `/api/payments/notify/wechat/native` | 微信支付真实异步通知，验签后处理；不返回统一 JSON | 微信平台回调原始请求 |
| `POST` | `/api/payments/notify/alipay/scan` | 支付宝真实异步通知，验签后处理；返回 `success/fail` | 支付宝平台回调表单 |
| `GET` | `/api/payments/wallet` | 已实现 | 无参数 |
| `GET` | `/api/payments/wallet/transactions` | 已实现 | Query: `page,pageSize` |
| `GET` | `/api/payments/quotas` | 已实现 | 无参数 |
| `GET` | `/api/admin/payments/orders` | 已实现后台支付订单分页列表 | Query: `page,pageSize,keyword,status,payMethod,orderType,userId` |
| `GET` | `/api/admin/payments/orders/{orderNo}` | 已实现后台支付订单详情 | Path: `orderNo` |
| `POST` | `/api/admin/payments/orders/{orderNo}/query-provider` | 已实现后台手动查单补偿 | Path: `orderNo` |
| `POST` | `/api/admin/quotas/adjust` | 已实现 | Body: `{"userId":"1000000000000000102","quotaType":"script_generate","changeCount":10,"remark":"后台加额度"}` |
| `GET` | `/api/membership/current` | 已实现 | 无参数 |

### Analytics 投放分析

| 方法 | 路径 | 实现状态 | 测试参数 |
| --- | --- | --- | --- |
| `GET` | `/api/analytics/monitor-links` | 已实现 | Query: `page,pageSize,projectId` |
| `POST` | `/api/analytics/monitor-links` | 已实现 | Body: `{"projectId":"1871234567890123001","scriptId":"1871234567890123002","linkType":"douyin","variantName":"A版","url":"https://example.com/a","status":1}` |
| `PUT` | `/api/analytics/monitor-links/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `GET` | `/api/analytics/metrics` | 已实现 | Query: `page,pageSize,projectId` |
| `POST` | `/api/analytics/metrics` | 已实现 | Body: `{"projectId":"1871234567890123001","scriptId":"1871234567890123002","monitorLinkId":"1871234567890126001","source":"manual","metricDate":"2026-06-20","plays":1000,"likes":50,"comments":8,"favorites":20,"shares":5,"orders":3,"revenue":299.00,"roi":1.2500}` |
| `GET` | `/api/analytics/ab-tests` | 已实现 | Query: `page,pageSize,projectId` |
| `POST` | `/api/analytics/ab-tests` | 已实现 | Body: `{"projectId":"1871234567890123001","testName":"首屏钩子A/B","status":"draft","startTime":"2026-06-20T10:00:00","endTime":"2026-06-27T10:00:00"}` |
| `PUT` | `/api/analytics/ab-tests/{id}` | 已实现 | Path: `id`; Body 同创建 |
| `GET` | `/api/analytics/ab-tests/{id}/variants` | 已实现 | Path: `id` |
| `POST` | `/api/analytics/ab-tests/{id}/variants` | 已实现 | Path: `id`; Body: `{"scriptId":"1871234567890123002","variantName":"A版","monitorLinkId":"1871234567890126001","plays":1000,"interactionRate":0.08,"conversionRate":0.01,"isWinner":0}` |
| `PUT` | `/api/analytics/ab-tests/{id}/variants/{variantId}` | 已实现 | Path: `id,variantId`; Body 同创建 |
