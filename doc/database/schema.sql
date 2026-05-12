-- AI Script Platform PostgreSQL schema
-- 主数据库：PostgreSQL 15+；向量检索：pgvector；UUID：pgcrypto。

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================
-- 1. 租户、用户、权限、菜单
-- =========================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  code VARCHAR(80) NOT NULL UNIQUE,
  contact_name VARCHAR(80),
  contact_phone VARCHAR(40),
  contact_email VARCHAR(160),
  domain VARCHAR(160),
  logo_url TEXT,
  theme_key VARCHAR(40) DEFAULT 'green',
  status VARCHAR(32) NOT NULL DEFAULT 'trial',
  plan VARCHAR(40) DEFAULT 'standard',
  storage_quota_bytes BIGINT DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE tenants IS '品牌租户表，所有品牌隔离数据的根实体。';

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(80) NOT NULL,
  account VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(40),
  email VARCHAR(160),
  password_hash TEXT NOT NULL,
  user_type VARCHAR(32) NOT NULL DEFAULT 'front',
  role_label VARCHAR(80),
  points_balance INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE users IS '前台用户和后台管理员账号表。';
COMMENT ON COLUMN users.points_balance IS '前台用户积分余额，用于首页我的信息展示和后续积分消耗。';

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(80) NOT NULL,
  code VARCHAR(80) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE roles IS '角色表，tenant_id 为空代表全局系统角色。';

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  module VARCHAR(80) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE permissions IS '后台和前台授权使用的权限点。';

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
COMMENT ON TABLE role_permissions IS '角色与权限点关联表。';

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
COMMENT ON TABLE user_roles IS '用户与角色关联表。';

CREATE TABLE admin_menus (
  id VARCHAR(80) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  path VARCHAR(160) NOT NULL,
  permission_code VARCHAR(120) NOT NULL REFERENCES permissions(code),
  parent_id VARCHAR(80) REFERENCES admin_menus(id),
  icon VARCHAR(80),
  enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE admin_menus IS '后台动态菜单配置表，前端按 enabled、permission_code、display_order 渲染。';

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE refresh_tokens IS '登录刷新令牌表，只保存 token hash。';

CREATE TABLE operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  module VARCHAR(80) NOT NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(80),
  target_id UUID,
  request_payload JSONB,
  result VARCHAR(32) NOT NULL DEFAULT 'success',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE operation_logs IS '不可删除的后台操作审计日志。';

-- =========================
-- 2. 后台配置、解析与插件
-- =========================

CREATE TABLE api_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  provider_type VARCHAR(40) NOT NULL,
  provider_name VARCHAR(120) NOT NULL,
  platform VARCHAR(60),
  endpoint_url TEXT,
  api_key_encrypted TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  rate_limit_per_minute INTEGER,
  timeout_ms INTEGER DEFAULT 8000,
  retry_count INTEGER DEFAULT 2,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE api_provider_configs IS '第三方解析、AI、文生视频、TTS、平台数据等 API 配置。';

CREATE TABLE parsing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID,
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES api_provider_configs(id),
  platform VARCHAR(60) NOT NULL,
  source_url TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  parsed_payload JSONB,
  cost_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE parsing_logs IS '前台爆款链接解析请求日志。';

CREATE TABLE browser_plugin_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(40) NOT NULL UNIQUE,
  package_url TEXT NOT NULL,
  release_type VARCHAR(32) NOT NULL DEFAULT 'stable',
  force_update BOOLEAN NOT NULL DEFAULT false,
  changelog TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE browser_plugin_versions IS 'Chrome 插件版本和安装包管理。';

CREATE TABLE browser_plugin_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  version_id UUID REFERENCES browser_plugin_versions(id),
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE browser_plugin_authorizations IS '插件使用授权租户白名单。';

CREATE TABLE data_cleaning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(60) NOT NULL,
  rule_name VARCHAR(120) NOT NULL,
  rule_config JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE data_cleaning_rules IS '解析数据清洗和字段映射规则。';

-- =========================
-- 3. 前台项目与 9 步流程
-- =========================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(180) NOT NULL,
  product_name VARCHAR(180),
  platform VARCHAR(60),
  video_ratio VARCHAR(20),
  video_type VARCHAR(60),
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  current_step VARCHAR(60) NOT NULL DEFAULT 'global',
  progress INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE projects IS '前台短视频脚本项目主表。';

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role VARCHAR(40) NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
COMMENT ON TABLE project_members IS '项目协作成员。';

CREATE TABLE project_step_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  step_key VARCHAR(60) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, step_key)
);
COMMENT ON TABLE project_step_states IS '前台 9 步流程状态和每步草稿数据。';

CREATE TABLE project_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id),
  upload_type VARCHAR(80) NOT NULL,
  file_name VARCHAR(240) NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type VARCHAR(120),
  file_size_bytes BIGINT,
  status VARCHAR(32) NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE project_uploads IS '项目内模板、参考图、音频等上传文件记录。';

-- =========================
-- 4. 产品卖点与资产库
-- =========================

CREATE TABLE product_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_name VARCHAR(180) NOT NULL,
  primary_selling_point TEXT,
  target_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  other_requirements TEXT,
  brief_text TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE product_briefs IS '项目产品 Brief 和目标人群要求。';

CREATE TABLE product_selling_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES product_briefs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  point_type VARCHAR(32) NOT NULL DEFAULT 'auxiliary',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE product_selling_points IS '产品 Brief 下的主卖点、辅助卖点和候选卖点。';

CREATE TABLE selling_point_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(180) NOT NULL,
  source_type VARCHAR(60) NOT NULL DEFAULT 'manual',
  tag VARCHAR(80),
  main_point TEXT,
  target_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  usage_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE selling_point_assets IS '我的卖点资产库，支持前台步骤 2 复用。';

CREATE TABLE selling_point_asset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES selling_point_assets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  point_type VARCHAR(32) NOT NULL DEFAULT 'auxiliary',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE selling_point_asset_items IS '卖点资产包中的明细条目。';

CREATE TABLE viral_script_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(180) NOT NULL,
  source_type VARCHAR(60) NOT NULL DEFAULT 'upload',
  asset_kind VARCHAR(60) NOT NULL,
  platform VARCHAR(60),
  source_url TEXT,
  script_text TEXT,
  structure_formula TEXT,
  shot_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  storage_key TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE viral_script_assets IS '爆款链接脚本资产库，保存用户上传或解析沉淀的脚本、结构公式、拉片报告，供前台步骤 3 复用。';
COMMENT ON COLUMN viral_script_assets.asset_kind IS '资产类型：script、structure_formula、shot_report、link_analysis 等。';

-- =========================
-- 5. 爆款解析、原创模板、结构公式
-- =========================

CREATE TABLE source_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mode VARCHAR(32) NOT NULL DEFAULT 'viral',
  source_url TEXT,
  platform VARCHAR(60),
  title VARCHAR(240),
  account_name VARCHAR(160),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  structure_summary TEXT,
  editable_content TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE source_analyses IS '爆款链接解析结果或原创结构分析主记录。';

CREATE TABLE source_analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES source_analyses(id) ON DELETE CASCADE,
  report_type VARCHAR(60) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE source_analysis_reports IS '完整文案、结构公式、拉片报告等解析明细。';

CREATE TABLE structure_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(180) NOT NULL,
  platform VARCHAR(60),
  video_type VARCHAR(80),
  formula_text TEXT NOT NULL,
  scenario TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_analysis_id UUID REFERENCES source_analyses(id),
  usage_count INTEGER NOT NULL DEFAULT 0,
  risk_level VARCHAR(32) DEFAULT 'low',
  is_public BOOLEAN NOT NULL DEFAULT false,
  embedding VECTOR(1536),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE structure_formulas IS '私有或公共结构公式库，embedding 用于原创度和相似结构检索。';

CREATE TABLE original_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  structure TEXT NOT NULL,
  scenario TEXT,
  prompt TEXT,
  platform VARCHAR(60),
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE original_templates IS '原创爆款模板库脚本。';

-- =========================
-- 6. 脚本、分镜、合规、审核
-- =========================

CREATE TABLE storyboard_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(220) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  audit_status VARCHAR(32) NOT NULL DEFAULT 'not_submitted',
  current_version_id UUID,
  share_token VARCHAR(120) UNIQUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE storyboard_scripts IS '分镜脚本主记录。';

CREATE TABLE script_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id UUID NOT NULL REFERENCES storyboard_scripts(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  title VARCHAR(220) NOT NULL,
  content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_note TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (script_id, version_no)
);
COMMENT ON TABLE script_versions IS '分镜脚本版本快照，不覆盖历史版本。';

CREATE TABLE shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_version_id UUID NOT NULL REFERENCES script_versions(id) ON DELETE CASCADE,
  shot_no INTEGER NOT NULL,
  shot_label VARCHAR(40),
  shot_type VARCHAR(60),
  scene_description TEXT,
  line_text TEXT,
  duration_seconds NUMERIC(6,2),
  selling_point_note TEXT,
  compliance_risk VARCHAR(32) DEFAULT 'low',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE shots IS '分镜脚本中的镜头行。';

CREATE TABLE compliance_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  word VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  risk_level VARCHAR(32) NOT NULL DEFAULT 'medium',
  suggestion TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE compliance_words IS '广告法违禁词、行业敏感词和替换建议。';

CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_version_id UUID NOT NULL REFERENCES script_versions(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  risk_count INTEGER NOT NULL DEFAULT 0,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE compliance_checks IS '脚本合规检查结果。';

CREATE TABLE originality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_version_id UUID NOT NULL REFERENCES script_versions(id) ON DELETE CASCADE,
  similarity_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  matched_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggestion TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE originality_checks IS '原创度相似度检查结果。';

CREATE TABLE audit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  script_id UUID NOT NULL REFERENCES storyboard_scripts(id) ON DELETE CASCADE,
  current_version_id UUID REFERENCES script_versions(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  stage VARCHAR(60) NOT NULL DEFAULT 'operation_review',
  assignee_id UUID REFERENCES users(id),
  submitted_by UUID REFERENCES users(id),
  risk_summary TEXT,
  due_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
COMMENT ON TABLE audit_tasks IS '脚本审核任务。';

CREATE TABLE audit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_task_id UUID NOT NULL REFERENCES audit_tasks(id) ON DELETE CASCADE,
  auditor_id UUID REFERENCES users(id),
  action VARCHAR(40) NOT NULL,
  comment TEXT,
  from_status VARCHAR(32),
  to_status VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_records IS '审核任务流转轨迹，追加式审计记录。';

CREATE TABLE audit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(160) NOT NULL,
  rule_type VARCHAR(60) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE audit_rules IS '审核流程、阈值和通知规则配置。';

-- =========================
-- 7. 素材、视觉绑定、生成任务
-- =========================

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id),
  name VARCHAR(220) NOT NULL,
  asset_type VARCHAR(60) NOT NULL,
  category VARCHAR(80),
  status VARCHAR(32) NOT NULL DEFAULT 'available',
  storage_key TEXT,
  preview_url TEXT,
  mime_type VARCHAR(120),
  file_size_bytes BIGINT,
  duration_seconds NUMERIC(10,2),
  width INTEGER,
  height INTEGER,
  source VARCHAR(60) DEFAULT 'upload',
  usage_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
COMMENT ON TABLE assets IS '图片、音频、视频、导出文件等素材元数据。';

CREATE TABLE asset_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(80) NOT NULL,
  category VARCHAR(60),
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE asset_tags IS '素材标签体系，可全局或租户自定义。';

CREATE TABLE asset_tag_links (
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES asset_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (asset_id, tag_id)
);
COMMENT ON TABLE asset_tag_links IS '素材与标签多对多关联。';

CREATE TABLE visual_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shot_id UUID REFERENCES shots(id) ON DELETE SET NULL,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  binding_type VARCHAR(60) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE visual_bindings IS '场景、角色、道具、风格参考图与项目/分镜绑定关系。';

CREATE TABLE material_storage_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  used_bytes BIGINT NOT NULL DEFAULT 0,
  quota_bytes BIGINT NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE material_storage_usages IS '租户素材存储占用快照。';

CREATE TABLE generation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  task_type VARCHAR(60) NOT NULL,
  provider VARCHAR(80),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  label VARCHAR(240),
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code VARCHAR(80),
  error_message TEXT,
  idempotency_key VARCHAR(160),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE generation_tasks IS 'AI、视频、TTS、导出等异步任务状态表。';

CREATE TABLE video_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shot_id UUID REFERENCES shots(id) ON DELETE SET NULL,
  task_id UUID REFERENCES generation_tasks(id),
  asset_id UUID REFERENCES assets(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE video_segments IS '按分镜生成的视频片段。';

CREATE TABLE dubbing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES generation_tasks(id),
  asset_id UUID REFERENCES assets(id),
  mode VARCHAR(40) NOT NULL,
  voice VARCHAR(80),
  speed VARCHAR(40),
  tone VARCHAR(40),
  volume VARCHAR(20),
  lip_precision VARCHAR(60),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE dubbing_assets IS 'TTS 配音和对口型任务产物。';

CREATE TABLE timeline_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  selected_clip VARCHAR(80),
  transition_effect VARCHAR(80),
  background_music_asset_id UUID REFERENCES assets(id),
  resolution VARCHAR(20) DEFAULT '1080P',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);
COMMENT ON TABLE timeline_configs IS '成片预览时间轴、转场、音乐和导出清晰度配置。';

CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES generation_tasks(id),
  export_type VARCHAR(60) NOT NULL,
  resolution VARCHAR(20),
  file_name VARCHAR(240),
  asset_id UUID REFERENCES assets(id),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE export_jobs IS '脚本、视频、报表导出任务记录。';

-- =========================
-- 8. 投放数据和通知
-- =========================

CREATE TABLE monitor_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  script_id UUID REFERENCES storyboard_scripts(id),
  link_type VARCHAR(60) NOT NULL,
  variant_name VARCHAR(120),
  url TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE monitor_links IS '投放监测链接、优惠码、购物车参数链接。';

CREATE TABLE analytics_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  script_id UUID REFERENCES storyboard_scripts(id),
  monitor_link_id UUID REFERENCES monitor_links(id),
  source VARCHAR(60) NOT NULL DEFAULT 'mock',
  metric_date DATE NOT NULL,
  plays BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  favorites BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  orders BIGINT NOT NULL DEFAULT 0,
  revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  roi NUMERIC(8,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE analytics_metrics IS '投放数据指标日表。';

CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE ab_tests IS 'A/B 测试主记录。';

CREATE TABLE ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  script_id UUID REFERENCES storyboard_scripts(id),
  name VARCHAR(120) NOT NULL,
  monitor_link_id UUID REFERENCES monitor_links(id),
  plays BIGINT NOT NULL DEFAULT 0,
  interaction_rate NUMERIC(8,4),
  conversion_rate NUMERIC(8,4),
  is_winner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE ab_test_variants IS 'A/B 测试版本与效果结果。';

CREATE TABLE analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID REFERENCES projects(id),
  report_scope VARCHAR(60) NOT NULL,
  file_name VARCHAR(240),
  storage_key TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE analytics_reports IS '投放分析报告导出记录。';

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  channel VARCHAR(40) NOT NULL DEFAULT 'system',
  title VARCHAR(180) NOT NULL,
  content TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'unread',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE notifications IS '审核、导出、告警等系统通知。';

-- =========================
-- 9. 常用索引
-- =========================

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE UNIQUE INDEX ux_roles_global_code ON roles(code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX ux_roles_tenant_code ON roles(tenant_id, code) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_operation_logs_tenant_time ON operation_logs(tenant_id, created_at DESC);
CREATE INDEX idx_admin_menus_order ON admin_menus(enabled, display_order);
CREATE INDEX idx_parsing_logs_tenant_time ON parsing_logs(tenant_id, created_at DESC);
CREATE INDEX idx_projects_tenant_updated ON projects(tenant_id, updated_at DESC);
CREATE INDEX idx_project_step_states_project ON project_step_states(project_id);
CREATE INDEX idx_selling_point_assets_tenant ON selling_point_assets(tenant_id, updated_at DESC);
CREATE INDEX idx_viral_script_assets_tenant ON viral_script_assets(tenant_id, updated_at DESC);
CREATE INDEX idx_source_analyses_project ON source_analyses(project_id);
CREATE INDEX idx_structure_formulas_tenant ON structure_formulas(tenant_id, platform, video_type);
CREATE INDEX idx_storyboard_scripts_project ON storyboard_scripts(project_id);
CREATE INDEX idx_script_versions_script ON script_versions(script_id, version_no DESC);
CREATE INDEX idx_shots_version_order ON shots(script_version_id, display_order);
CREATE INDEX idx_audit_tasks_tenant_status ON audit_tasks(tenant_id, status, submitted_at DESC);
CREATE INDEX idx_assets_tenant_type ON assets(tenant_id, asset_type, created_at DESC);
CREATE INDEX idx_generation_tasks_project ON generation_tasks(project_id, created_at DESC);
CREATE UNIQUE INDEX ux_generation_tasks_idempotency ON generation_tasks(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_analytics_metrics_project_date ON analytics_metrics(project_id, metric_date DESC);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status, created_at DESC);

-- pgvector 相似度索引建议在有数据后创建，避免空表初始化耗时。
-- CREATE INDEX idx_structure_formulas_embedding ON structure_formulas USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
