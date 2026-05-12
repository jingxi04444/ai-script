# 数据库设计说明

## 数据库选型

主业务数据库使用 **PostgreSQL 15+**。

原因：

- 支持强事务、外键、JSONB、复杂查询，适合多租户业务数据、审核记录、项目工作流和配置管理。
- 支持 `pgvector` 扩展，可在 MVP 阶段直接承载结构公式、脚本特征、原创度相似度向量检索。
- 与 FastAPI + SQLAlchemy / SQLModel + Alembic 组合成熟，便于后续生成迁移文件和 OpenAPI。

配套基础设施：

- **Redis**：缓存、登录态辅助、任务进度缓存、RQ/Celery 队列，不作为主业务数据源。
- **S3 兼容对象存储**：MinIO / OSS / COS，用于保存图片、视频、音频、导出文件；PostgreSQL 只保存文件元数据和 `storage_key`。
- **PostgreSQL pgvector**：MVP 向量检索方案，后续数据量上来后可切到 Qdrant / Milvus。

## 文件说明

| 文件 | 说明 |
| --- | --- |
| `schema.sql` | PostgreSQL 初始化建表 DDL，含核心索引与字段注释。 |
| `seed.sql` | MVP 初始租户、权限、菜单、角色、账号、基础规则、示例项目、脚本、素材和资产库数据。 |

## 设计原则

- 所有租户业务数据必须带 `tenant_id`，后台超级管理员可跨租户查询，普通用户/品牌管理员必须由后端租户上下文过滤。
- 审核记录、操作日志、脚本版本使用追加式记录，不做物理覆盖。
- 文件本体不入库，入对象存储；数据库只存元数据、访问地址和关联关系。
- 生成任务全部落库，确保刷新页面后可以恢复任务状态。
- 前台工作台 9 步以 `projects.current_step` 和 `project_step_states` 为准。
- 后台菜单由 `admin_menus` 动态返回，按 `enabled`、`permission_code`、`display_order` 渲染。
- 大模型 Provider 统一存入 `api_provider_configs(provider_type='llm')`，密钥字段可保存加密值或 `env:VAR_NAME` 引用，接口返回必须脱敏。

## 表清单与字段说明

### 1. 租户、用户、权限、菜单

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `tenants` | 品牌租户。 | `name` 品牌名称；`code` 租户编码；`status` 启用/试用/停用；`storage_quota_bytes` 存储上限；`theme_key` 前台主题。 |
| `users` | 前台和后台用户账号。 | `tenant_id` 所属租户；`account` 登录账号；`password_hash` 密码哈希；`user_type` front/admin；`points_balance` 前台积分余额；`status` 状态；`last_login_at` 最近登录。 |
| `roles` | 角色。 | `tenant_id` 为空表示系统角色；`code` 角色标识；`name` 角色名称；`is_system` 是否系统预置。 |
| `permissions` | 权限点。 | `code` 权限标识；`module` 所属模块；`name` 权限名称。 |
| `role_permissions` | 角色-权限关联。 | `role_id`、`permission_id`。 |
| `user_roles` | 用户-角色关联。 | `user_id`、`role_id`。 |
| `admin_menus` | 后台动态菜单配置。 | `id` 菜单 ID；`label` 名称；`path` 路由；`permission_code` 权限标识；`enabled` 是否启用；`display_order` 排序。 |
| `refresh_tokens` | 登录刷新令牌。 | `user_id` 用户；`token_hash` 令牌哈希；`expires_at` 过期时间；`revoked_at` 注销时间。 |
| `operation_logs` | 操作审计日志。 | `tenant_id`、`user_id`、`module`、`action`、`target_type`、`target_id`、`result`、`ip_address`。 |

### 2. 后台配置、解析与插件

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `api_provider_configs` | AI、LLM、视频解析、TTS、数字人、平台数据 API 配置。 | `provider_type` 类型，LLM 使用 `llm`；`platform` 平台；`endpoint_url` OpenAI-compatible 地址；`api_key_encrypted` 加密 Key 或 `env:VAR_NAME` 引用；`priority` 优先级；`timeout_ms` 超时；`retry_count` 重试次数；`config.model` 模型 ID。 |
| `parsing_logs` | 爆款链接解析日志。 | `source_url` 原链接；`platform` 平台；`status` 状态；`failure_reason` 失败原因；`parsed_payload` 解析结果；`cost_ms` 耗时。 |
| `browser_plugin_versions` | 浏览器插件版本。 | `version` 版本号；`package_url` 安装包地址；`release_type` 发布方式；`force_update` 是否强制。 |
| `browser_plugin_authorizations` | 插件授权。 | `tenant_id` 授权租户；`version_id` 授权版本；`status` 状态。 |
| `data_cleaning_rules` | 解析数据清洗规则。 | `platform` 平台；`rule_name` 规则名；`rule_config` 规则 JSON；`enabled` 是否启用。 |

### 3. 前台项目与 9 步流程

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `projects` | 前台短视频脚本项目。 | `tenant_id`、`owner_id`、`title`、`product_name`、`platform`、`video_ratio`、`video_type`、`status`、`current_step`、`progress`。 |
| `project_members` | 项目协作者。 | `project_id`、`user_id`、`member_role`。 |
| `project_step_states` | 9 步流程状态与草稿。 | `project_id`、`step_key`、`status`、`data`、`completed_at`。 |
| `project_uploads` | 项目上传文件记录。 | `upload_type` 上传类型；`file_name` 原文件名；`storage_key` 对象存储 Key；`status`。 |

### 4. 产品卖点与资产库

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `product_briefs` | 项目产品 Brief。 | `project_id`、`product_name`、`primary_selling_point`、`target_groups`、`other_requirements`、`brief_text`、`version`。 |
| `product_selling_points` | Brief 下的卖点条目。 | `brief_id`、`content`、`point_type` 主/辅/候选；`display_order`。 |
| `selling_point_assets` | 我的卖点资产库 / 产品卖点资产库。 | `tenant_id`、`name`、`source_type`、`tag`、`main_point`、`usage_count`、`status`。 |
| `selling_point_asset_items` | 卖点资产库明细。 | `asset_id`、`content`、`point_type`、`metadata`。 |
| `viral_script_assets` | 爆款链接脚本资产库。 | `tenant_id`、`name`、`asset_kind` 脚本/结构公式/拉片报告；`platform`、`source_url`、`script_text`、`structure_formula`、`shot_report`、`storage_key`、`usage_count`。 |

### 5. 爆款解析、原创模板、结构公式

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `source_analyses` | 爆款链接解析或原创结构分析主记录。 | `project_id`、`mode`、`source_url`、`platform`、`metrics`、`structure_summary`、`editable_content`、`status`。 |
| `source_analysis_reports` | 完整文案、结构公式、拉片报告等明细。 | `analysis_id`、`report_type`、`content`。 |
| `structure_formulas` | 私有 / 公共结构公式库。 | `tenant_id` 为空表示公共；`formula_text`；`scenario`；`tags`；`embedding` 用于向量检索；`usage_count`。 |
| `original_templates` | 原创爆款模板库。 | `name`、`structure`、`scenario`、`prompt`、`platform`、`status`。 |

### 6. 脚本、分镜、合规、审核

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `storyboard_scripts` | 分镜脚本主记录。 | `project_id`、`name`、`status`、`audit_status`、`share_token`。 |
| `script_versions` | 脚本版本快照。 | `script_id`、`version_no`、`content_snapshot`、`change_note`。 |
| `shots` | 分镜行。 | `script_version_id`、`shot_no`、`shot_type`、`scene_description`、`line_text`、`duration_seconds`、`selling_point_note`。 |
| `compliance_words` | 合规词库。 | `word`、`category`、`risk_level`、`suggestion`、`tenant_id`。 |
| `compliance_checks` | 合规检查结果。 | `script_version_id`、`risk_count`、`result`。 |
| `originality_checks` | 原创度检查结果。 | `script_version_id`、`similarity_percent`、`matched_sources`、`suggestion`。 |
| `audit_tasks` | 审核任务。 | `script_id`、`current_version_id`、`status`、`stage`、`assignee_id`、`submitted_by`、`risk_summary`。 |
| `audit_records` | 审核流转记录。 | `audit_task_id`、`auditor_id`、`action`、`comment`、`from_status`、`to_status`。 |
| `audit_rules` | 审核规则配置。 | `rule_type`、`config`、`enabled`。 |

### 7. 素材、视觉绑定、生成任务

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `assets` | 图片、音频、视频、导出文件元数据。 | `asset_type`、`category`、`storage_key`、`preview_url`、`mime_type`、`file_size_bytes`、`source`、`metadata`。 |
| `asset_tags` | 素材标签体系。 | `name`、`category`、`tenant_id`、`status`。 |
| `asset_tag_links` | 素材与标签关联。 | `asset_id`、`tag_id`。 |
| `visual_bindings` | 分镜绑定场景 / 角色 / 道具 / 风格参考图。 | `project_id`、`shot_id`、`asset_id`、`binding_type`。 |
| `material_storage_usages` | 租户存储用量快照。 | `tenant_id`、`used_bytes`、`quota_bytes`、`calculated_at`。 |
| `generation_tasks` | AI、视频、TTS、导出等异步任务。 | `task_type`、`provider`、`status`、`progress`、`input_payload`、`result_payload`、`idempotency_key`。 |
| `video_segments` | 分镜视频片段。 | `shot_id`、`task_id`、`asset_id`、`tags`、`duration_seconds`。 |
| `dubbing_assets` | 配音 / 对口型结果。 | `mode`、`voice`、`speed`、`tone`、`volume`、`lip_precision`、`asset_id`。 |
| `timeline_configs` | 成片时间轴配置。 | `project_id`、`selected_clip`、`transition_effect`、`background_music_asset_id`、`resolution`、`config`。 |
| `export_jobs` | 脚本 / 视频 / 报表导出任务。 | `export_type`、`resolution`、`file_name`、`asset_id`、`status`。 |

### 8. 投放数据和通知

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `monitor_links` | 投放监测链接。 | `project_id`、`script_id`、`link_type`、`variant_name`、`url`、`status`。 |
| `analytics_metrics` | 投放指标日表。 | `metric_date`、`plays`、`likes`、`comments`、`favorites`、`shares`、`orders`、`revenue`、`roi`。 |
| `ab_tests` | A/B 测试主记录。 | `project_id`、`name`、`status`、`started_at`、`ended_at`。 |
| `ab_test_variants` | A/B 测试版本。 | `ab_test_id`、`script_id`、`monitor_link_id`、`interaction_rate`、`conversion_rate`、`is_winner`。 |
| `analytics_reports` | 数据报表导出记录。 | `report_scope`、`file_name`、`storage_key`、`status`。 |
| `notifications` | 系统通知。 | `user_id`、`channel`、`title`、`content`、`status`、`read_at`。 |

## 命名约定

- 表名使用复数下划线：`project_step_states`。
- 主键统一 `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`。
- 时间字段统一 `created_at`、`updated_at`、必要时 `deleted_at`、`archived_at`。
- JSON 扩展字段使用 `JSONB`，避免频繁迁移非核心字段。
- 金额使用 `NUMERIC(14,2)`，比率使用 `NUMERIC(8,4)`。
- 状态字段 MVP 使用 `VARCHAR` + 后端枚举约束，后续稳定后可迁移为 PostgreSQL enum。
