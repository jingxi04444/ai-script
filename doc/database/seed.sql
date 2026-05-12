-- AI Script Platform MVP seed data
-- 先执行 schema.sql，再执行本文件。
-- password_hash 为开发占位哈希；生产环境必须由后端初始化流程重置真实密码。

BEGIN;

-- =========================
-- 1. 租户
-- =========================

INSERT INTO tenants (id, name, code, contact_name, contact_email, theme_key, status, plan, storage_quota_bytes, starts_at, expires_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', '北钥宠物生活', 'beiyue-pet', '唐雨', 'tangyu@ai-script.local', 'green', 'enabled', 'standard', 214748364800, now(), now() + interval '365 days'),
  ('00000000-0000-0000-0000-000000000102', '轻食研究所', 'light-food-lab', '周南', 'zhounan@ai-script.local', 'blue', 'enabled', 'standard', 107374182400, now(), now() + interval '365 days'),
  ('00000000-0000-0000-0000-000000000103', '城市通勤', 'city-commute', '小禾', 'xiaohe@ai-script.local', 'orange', 'trial', 'trial', 53687091200, now(), now() + interval '30 days')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  contact_name = EXCLUDED.contact_name,
  contact_email = EXCLUDED.contact_email,
  theme_key = EXCLUDED.theme_key,
  status = EXCLUDED.status,
  plan = EXCLUDED.plan,
  storage_quota_bytes = EXCLUDED.storage_quota_bytes,
  updated_at = now();

-- =========================
-- 2. 权限点
-- =========================

INSERT INTO permissions (id, code, name, module, description)
VALUES
  ('00000000-0000-0000-0000-000000001001', 'dashboard', '数据概览', 'admin', '查看后台数据概览、队列和核心指标。'),
  ('00000000-0000-0000-0000-000000001002', 'parsing', '解析管理', 'admin', '管理爆款链接解析记录、重试和解析服务配置。'),
  ('00000000-0000-0000-0000-000000001003', 'knowledge', '知识库', 'admin', '管理结构公式、原创模板和知识库导入。'),
  ('00000000-0000-0000-0000-000000001004', 'audit', '审核工作流', 'admin', '处理脚本审核、合规风险和审核规则。'),
  ('00000000-0000-0000-0000-000000001005', 'materials', '素材项目库', 'admin', '管理素材、项目文件和存储占用。'),
  ('00000000-0000-0000-0000-000000001006', 'analytics', '投放数据', 'admin', '查看投放效果、监测链接和报表导出。'),
  ('00000000-0000-0000-0000-000000001011', 'llm', '大模型配置', 'admin', '管理大模型 Provider、Endpoint、密钥引用和故障切换。'),
  ('00000000-0000-0000-0000-000000001007', 'users', '用户管理', 'admin', '管理后台账号、前台用户和账号状态。'),
  ('00000000-0000-0000-0000-000000001008', 'roles', '角色权限', 'admin', '管理角色、权限点和用户授权。'),
  ('00000000-0000-0000-0000-000000001009', 'logs', '操作日志', 'admin', '查看后台操作审计日志。'),
  ('00000000-0000-0000-0000-000000001010', 'system', '系统权限', 'admin', '管理租户、动态菜单和系统配置。'),
  ('00000000-0000-0000-0000-000000001101', 'front.projects', '前台项目', 'front', '创建、查看、重命名和归档前台项目。'),
  ('00000000-0000-0000-0000-000000001102', 'front.assets', '我的资产库', 'front', '管理我的卖点资产库和爆款链接脚本资产库。'),
  ('00000000-0000-0000-0000-000000001103', 'front.workflow', '工作台流程', 'front', '保存和推进前台 9 步工作台流程。')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module,
  description = EXCLUDED.description;

-- =========================
-- 3. 角色与角色权限
-- =========================

INSERT INTO roles (id, tenant_id, name, code, description, is_system, status)
VALUES
  ('00000000-0000-0000-0000-000000002001', NULL, '超级管理员', 'super_admin', '可管理全部租户、菜单、权限和系统配置。', true, 'enabled'),
  ('00000000-0000-0000-0000-000000002002', NULL, '品牌管理员', 'brand_admin', '可管理本品牌知识库、项目、素材和审核记录。', true, 'enabled'),
  ('00000000-0000-0000-0000-000000002003', NULL, '审核员', 'reviewer', '仅可处理分配给自己的脚本审核任务。', true, 'enabled'),
  ('00000000-0000-0000-0000-000000002004', NULL, '前台创作者', 'front_creator', '可使用前台 9 步脚本生成工作台。', true, 'enabled')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000002001', id FROM permissions
WHERE code IN ('dashboard', 'parsing', 'knowledge', 'audit', 'materials', 'analytics', 'llm', 'users', 'roles', 'logs', 'system', 'front.projects', 'front.assets', 'front.workflow')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000002002', id FROM permissions
WHERE code IN ('dashboard', 'knowledge', 'audit', 'materials', 'analytics', 'front.projects', 'front.assets', 'front.workflow')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000002003', id FROM permissions
WHERE code IN ('audit')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000002004', id FROM permissions
WHERE code IN ('front.projects', 'front.assets', 'front.workflow')
ON CONFLICT DO NOTHING;

-- =========================
-- 4. 用户与用户角色
-- =========================

INSERT INTO users (id, tenant_id, name, account, phone, email, password_hash, user_type, role_label, points_balance, status)
VALUES
  ('00000000-0000-0000-0000-000000003001', NULL, '系统管理员', 'admin@ai-script.local', NULL, 'admin@ai-script.local', '$argon2id$v=19$m=65536,t=3,p=4$replace-me$replace-me', 'admin', '超级管理员', 0, 'enabled'),
  ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000000101', '唐雨', 'tangyu@ai-script.local', NULL, 'tangyu@ai-script.local', '$argon2id$v=19$m=65536,t=3,p=4$replace-me$replace-me', 'admin', '品牌管理员', 0, 'enabled'),
  ('00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000000102', '周南', 'zhounan@ai-script.local', NULL, 'zhounan@ai-script.local', '$argon2id$v=19$m=65536,t=3,p=4$replace-me$replace-me', 'admin', '审核员', 0, 'disabled'),
  ('00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000000101', '林楠', 'linnan@ai-script.local', NULL, 'linnan@ai-script.local', '$argon2id$v=19$m=65536,t=3,p=4$replace-me$replace-me', 'front', '增长编导', 1280, 'enabled')
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  name = EXCLUDED.name,
  account = EXCLUDED.account,
  email = EXCLUDED.email,
  user_type = EXCLUDED.user_type,
  role_label = EXCLUDED.role_label,
  points_balance = EXCLUDED.points_balance,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('00000000-0000-0000-0000-000000003001', '00000000-0000-0000-0000-000000002001'),
  ('00000000-0000-0000-0000-000000003002', '00000000-0000-0000-0000-000000002002'),
  ('00000000-0000-0000-0000-000000003003', '00000000-0000-0000-0000-000000002003'),
  ('00000000-0000-0000-0000-000000003004', '00000000-0000-0000-0000-000000002004')
ON CONFLICT DO NOTHING;

-- =========================
-- 5. 后台动态菜单
-- =========================

INSERT INTO admin_menus (id, label, path, permission_code, icon, enabled, display_order)
VALUES
  ('dashboard', '数据概览', '/admin/dashboard', 'dashboard', 'dashboard', true, 10),
  ('parsing', '解析管理', '/admin/parsing', 'parsing', 'link', true, 20),
  ('knowledge', '知识库', '/admin/knowledge', 'knowledge', 'book', true, 30),
  ('audit', '审核工作流', '/admin/audit', 'audit', 'shield', true, 40),
  ('materials', '素材项目库', '/admin/materials', 'materials', 'folder', true, 50),
  ('analytics', '投放数据', '/admin/analytics', 'analytics', 'chart', true, 60),
  ('llm', '大模型配置', '/admin/llm', 'llm', 'cpu', true, 70),
  ('users', '用户管理', '/admin/users', 'users', 'users', true, 80),
  ('roles', '角色权限', '/admin/roles', 'roles', 'key', true, 90),
  ('logs', '操作日志', '/admin/logs', 'logs', 'list', true, 100),
  ('system', '系统权限', '/admin/system', 'system', 'settings', true, 110)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  path = EXCLUDED.path,
  permission_code = EXCLUDED.permission_code,
  icon = EXCLUDED.icon,
  enabled = EXCLUDED.enabled,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- =========================
-- 6. MVP 基础配置与知识库数据
-- =========================

INSERT INTO asset_tags (id, tenant_id, name, category, status)
VALUES
  ('00000000-0000-0000-0000-000000004001', NULL, '场景', 'visual', 'enabled'),
  ('00000000-0000-0000-0000-000000004002', NULL, '角色', 'visual', 'enabled'),
  ('00000000-0000-0000-0000-000000004003', NULL, '道具', 'visual', 'enabled'),
  ('00000000-0000-0000-0000-000000004004', NULL, '已收藏', 'system', 'enabled')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = EXCLUDED.status;

INSERT INTO compliance_words (id, tenant_id, word, category, risk_level, suggestion, status, created_by)
VALUES
  ('00000000-0000-0000-0000-000000004101', NULL, '最有效', '广告法极限词', 'high', '建议改为“更适合”或补充可验证依据。', 'enabled', '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-000000004102', NULL, '全网第一', '广告法极限词', 'high', '建议删除绝对化表述。', 'enabled', '00000000-0000-0000-0000-000000003001')
ON CONFLICT (id) DO UPDATE SET
  word = EXCLUDED.word,
  category = EXCLUDED.category,
  risk_level = EXCLUDED.risk_level,
  suggestion = EXCLUDED.suggestion,
  status = EXCLUDED.status;

INSERT INTO original_templates (id, name, structure, scenario, prompt, platform, status)
VALUES
  ('00000000-0000-0000-0000-000000004201', '3 秒痛点 + 产品方案 + 轻 CTA', '痛点开场 -> 产品方案 -> 场景验证 -> 轻 CTA', '日用消费品短视频', '基于产品卖点生成 4-6 镜头短视频脚本，避免绝对化承诺。', '抖音', 'enabled'),
  ('00000000-0000-0000-0000-000000004202', '测评开箱 + 三项实测 + 人群总结', '开箱 -> 三项实测 -> 使用感受 -> 适用人群总结', '小红书测评内容', '用真实测评口吻输出结构化脚本。', '小红书', 'enabled')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  structure = EXCLUDED.structure,
  scenario = EXCLUDED.scenario,
  prompt = EXCLUDED.prompt,
  platform = EXCLUDED.platform,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO structure_formulas (id, tenant_id, name, platform, video_type, formula_text, scenario, tags, usage_count, risk_level, is_public, created_by)
VALUES
  ('00000000-0000-0000-0000-000000004211', NULL, '3 秒痛点 + 产品方案 + 轻 CTA', '抖音', '剧情口播', '痛点开场 -> 产品方案 -> 场景验证 -> 轻 CTA', '日用消费品短视频', '["痛点", "轻转化"]'::jsonb, 142, 'low', true, '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-000000004212', NULL, '测评开箱 + 三项实测 + 人群总结', '小红书', '产品展示', '开箱悬念 -> 三项实测 -> 反差结果 -> 适用人群总结', '小红书测评内容', '["测评", "种草"]'::jsonb, 88, 'low', true, '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-000000004213', '00000000-0000-0000-0000-000000000101', '剧情误会 + 产品救场 + 情绪反转', '视频号', '情感共鸣', '误会冲突 -> 尴尬升级 -> 产品救场 -> 关系缓和', '宠物用品剧情短视频', '["剧情", "反转"]'::jsonb, 51, 'medium', false, '00000000-0000-0000-0000-000000003004')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  platform = EXCLUDED.platform,
  video_type = EXCLUDED.video_type,
  formula_text = EXCLUDED.formula_text,
  scenario = EXCLUDED.scenario,
  tags = EXCLUDED.tags,
  usage_count = EXCLUDED.usage_count,
  risk_level = EXCLUDED.risk_level,
  is_public = EXCLUDED.is_public,
  updated_at = now();

INSERT INTO audit_rules (id, tenant_id, name, rule_type, config, enabled)
VALUES
  ('00000000-0000-0000-0000-000000004301', NULL, '脚本提交默认审核流', 'workflow', '{"stages":["operation_review","legal_review"],"autoPassLowRisk":false}'::jsonb, true),
  ('00000000-0000-0000-0000-000000004302', NULL, '原创度风险阈值', 'originality', '{"warningPercent":65,"blockPercent":85}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rule_type = EXCLUDED.rule_type,
  config = EXCLUDED.config,
  enabled = EXCLUDED.enabled,
  updated_at = now();

INSERT INTO data_cleaning_rules (id, platform, rule_name, rule_config, enabled, created_by)
VALUES
  ('00000000-0000-0000-0000-000000004401', '抖音', '短链参数清洗', '{"removeQueryKeys":["share_token","timestamp"],"normalizeUrl":true}'::jsonb, true, '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-000000004402', '小红书', '笔记字段映射', '{"fieldMap":{"title":"note.title","content":"note.desc","metrics":"note.stats"}}'::jsonb, true, '00000000-0000-0000-0000-000000003001')
ON CONFLICT (id) DO UPDATE SET
  platform = EXCLUDED.platform,
  rule_name = EXCLUDED.rule_name,
  rule_config = EXCLUDED.rule_config,
  enabled = EXCLUDED.enabled,
  updated_at = now();

INSERT INTO api_provider_configs (id, tenant_id, provider_type, provider_name, platform, endpoint_url, api_key_encrypted, priority, timeout_ms, retry_count, status, config, created_by)
VALUES
  ('00000000-0000-0000-0000-000000004501', NULL, 'llm', 'DeepSeek OpenAI Compatible', 'deepseek', 'https://api.deepseek.com/v1', 'env:DEEPSEEK_API_KEY', 10, 60000, 2, 'enabled', '{"model":"deepseek-chat","temperature":0.3,"max_tokens":3000}'::jsonb, '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-000000004502', NULL, 'llm', 'Qwen DashScope Compatible', 'qwen', 'https://dashscope.aliyuncs.com/compatible-mode/v1', 'env:DASHSCOPE_API_KEY', 20, 60000, 2, 'enabled', '{"model":"qwen-plus","temperature":0.3,"max_tokens":3000}'::jsonb, '00000000-0000-0000-0000-000000003001'),
  ('00000000-0000-0000-0000-000000004503', NULL, 'llm', 'OpenAI Compatible Fallback', 'openai', 'https://api.openai.com/v1', 'env:OPENAI_API_KEY', 30, 60000, 2, 'enabled', '{"model":"gpt-4o-mini","temperature":0.3,"max_tokens":3000}'::jsonb, '00000000-0000-0000-0000-000000003001')
ON CONFLICT (id) DO UPDATE SET
  provider_name = EXCLUDED.provider_name,
  platform = EXCLUDED.platform,
  endpoint_url = EXCLUDED.endpoint_url,
  api_key_encrypted = EXCLUDED.api_key_encrypted,
  priority = EXCLUDED.priority,
  timeout_ms = EXCLUDED.timeout_ms,
  retry_count = EXCLUDED.retry_count,
  status = EXCLUDED.status,
  config = EXCLUDED.config,
  updated_at = now();

-- =========================
-- 7. 示例项目、脚本、素材和资产库数据
-- =========================

INSERT INTO projects (id, tenant_id, owner_id, title, product_name, platform, video_ratio, video_type, status, current_step, progress)
VALUES
  ('00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003004', '宠鲜鲜加热饭盒 - 职场加班版', '宠鲜鲜智能加热饭盒', '抖音', '9:16', '剧情口播', 'scripting', 'storyboard', 44),
  ('00000000-0000-0000-0000-000000007002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003004', '分层便当盒 - 小红书测评', '分层便当盒', '小红书', '9:16', '产品展示', 'draft', 'selling-points', 22)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  product_name = EXCLUDED.product_name,
  platform = EXCLUDED.platform,
  video_ratio = EXCLUDED.video_ratio,
  video_type = EXCLUDED.video_type,
  status = EXCLUDED.status,
  current_step = EXCLUDED.current_step,
  progress = EXCLUDED.progress,
  updated_at = now();

INSERT INTO project_step_states (id, project_id, step_key, status, data, completed_at)
VALUES
  ('00000000-0000-0000-0000-000000007011', '00000000-0000-0000-0000-000000007001', 'global', 'completed', '{"videoRatio":"9:16","platform":"抖音","videoType":"剧情口播"}'::jsonb, now()),
  ('00000000-0000-0000-0000-000000007012', '00000000-0000-0000-0000-000000007001', 'selling-points', 'completed', '{"productName":"宠鲜鲜智能加热饭盒","primarySellingPoint":"20 分钟快速加热"}'::jsonb, now())
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  data = EXCLUDED.data,
  completed_at = EXCLUDED.completed_at,
  updated_at = now();

INSERT INTO parsing_logs (id, tenant_id, project_id, user_id, platform, source_url, status, parsed_payload, cost_ms)
VALUES
  ('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000003004', '抖音', 'douyin.com/video/7423', 'success', '{"title":"加班冷饭痛点爆款视频"}'::jsonb, 1800),
  ('00000000-0000-0000-0000-000000007102', '00000000-0000-0000-0000-000000000102', NULL, '00000000-0000-0000-0000-000000003001', '小红书', 'xiaohongshu.com/explore/98', 'failed', '{"reason":"链接失效"}'::jsonb, 5200),
  ('00000000-0000-0000-0000-000000007103', '00000000-0000-0000-0000-000000000103', NULL, '00000000-0000-0000-0000-000000003001', '抖音', 'douyin.com/video/7419', 'success', '{"title":"通勤杯剧情反转"}'::jsonb, 2100)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  parsed_payload = EXCLUDED.parsed_payload,
  cost_ms = EXCLUDED.cost_ms;

INSERT INTO storyboard_scripts (id, tenant_id, project_id, name, status, audit_status, created_by)
VALUES
  ('00000000-0000-0000-0000-000000007201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007001', '宠鲜鲜加热饭盒_职场加班版_v3', 'draft', 'submitted', '00000000-0000-0000-0000-000000003004')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  audit_status = EXCLUDED.audit_status,
  updated_at = now();

INSERT INTO script_versions (id, script_id, version_no, title, content_snapshot, change_note, created_by)
VALUES
  ('00000000-0000-0000-0000-000000007202', '00000000-0000-0000-0000-000000007201', 1, '宠鲜鲜加热饭盒_职场加班版_v3', '[{"shot":"镜号 01","type":"特写","scene":"加班工位，冷掉的便当盒放在键盘旁。","line":"加班到晚上，想吃一口热饭怎么就这么难？","duration":"3s","point":"痛点开场","risk":"低"}]'::jsonb, 'seed 初始版本', '00000000-0000-0000-0000-000000003004')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content_snapshot = EXCLUDED.content_snapshot,
  change_note = EXCLUDED.change_note;

UPDATE storyboard_scripts
SET current_version_id = '00000000-0000-0000-0000-000000007202'
WHERE id = '00000000-0000-0000-0000-000000007201';

INSERT INTO shots (id, script_version_id, shot_no, shot_label, shot_type, scene_description, line_text, duration_seconds, selling_point_note, compliance_risk, display_order)
VALUES
  ('00000000-0000-0000-0000-000000007211', '00000000-0000-0000-0000-000000007202', 1, '镜号 01', '特写', '加班工位，冷掉的便当盒放在键盘旁，人物看向窗外城市灯光。', '加班到晚上，想吃一口热饭怎么就这么难？', 3, '痛点开场，建立职场场景代入', 'low', 1),
  ('00000000-0000-0000-0000-000000007212', '00000000-0000-0000-0000-000000007202', 2, '镜号 02', '中景', '插电启动加热饭盒，蒸汽升起，字幕强调 20 分钟快速加热。', '插电 20 分钟，办公室也能吃上刚热好的饭。', 4, '主卖点直出', 'low', 2),
  ('00000000-0000-0000-0000-000000007213', '00000000-0000-0000-0000-000000007202', 3, '镜号 03', '近景', '打开分层餐盒，米饭和配菜保持完整，人物吃下第一口后表情放松。', '分层不串味，忙一天也能认真吃顿热乎的。', 3, '辅助卖点自然植入', 'low', 3)
ON CONFLICT (id) DO UPDATE SET
  scene_description = EXCLUDED.scene_description,
  line_text = EXCLUDED.line_text,
  selling_point_note = EXCLUDED.selling_point_note;

INSERT INTO audit_tasks (id, tenant_id, project_id, script_id, current_version_id, status, stage, submitted_by, risk_summary)
VALUES
  ('00000000-0000-0000-0000-000000007231', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000007201', '00000000-0000-0000-0000-000000007202', 'pending', 'operation_review', '00000000-0000-0000-0000-000000003004', '1 处词库风险')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  stage = EXCLUDED.stage,
  risk_summary = EXCLUDED.risk_summary;

INSERT INTO assets (id, tenant_id, project_id, owner_id, name, asset_type, category, status, storage_key, preview_url, mime_type, file_size_bytes, source, usage_count, metadata)
VALUES
  ('00000000-0000-0000-0000-000000007301', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000003004', '办公室夜景参考', 'image', '场景', 'bound', 'assets/beiyue/office-night.png', '#', 'image/png', 4404019, 'upload', 12, '{"tag":"镜号01"}'::jsonb),
  ('00000000-0000-0000-0000-000000007302', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000003004', '加热饭盒产品特写', 'image', '道具', 'available', 'assets/beiyue/product-closeup.png', '#', 'image/png', 2516582, 'upload', 8, '{"tag":"镜号02"}'::jsonb),
  ('00000000-0000-0000-0000-000000007303', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000003004', '温柔女声旁白', 'audio', '音频', 'generated', 'assets/beiyue/voiceover.mp3', '#', 'audio/mpeg', 1677722, 'tts', 8, '{"tag":"TTS"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  file_size_bytes = EXCLUDED.file_size_bytes,
  usage_count = EXCLUDED.usage_count,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO generation_tasks (id, tenant_id, project_id, created_by, task_type, provider, status, progress, label, input_payload, result_payload)
VALUES
  ('00000000-0000-0000-0000-000000007401', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007001', '00000000-0000-0000-0000-000000003004', 'video-generation', 'mock-provider', 'running', 76, '正在生成镜号 03 视频片段', '{"shot":"镜号 03"}'::jsonb, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  progress = EXCLUDED.progress,
  label = EXCLUDED.label,
  updated_at = now();

INSERT INTO analytics_metrics (id, tenant_id, project_id, metric_date, plays, likes, comments, favorites, shares, orders, revenue, roi)
VALUES
  ('00000000-0000-0000-0000-000000007501', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007001', current_date, 1260000, 82000, 6400, 17000, 5300, 2418, 58032.00, 2.4),
  ('00000000-0000-0000-0000-000000007502', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000007002', current_date - interval '1 day', 2010000, 93000, 8300, 21000, 7800, 1830, 42150.00, 2.1)
ON CONFLICT (id) DO UPDATE SET
  plays = EXCLUDED.plays,
  likes = EXCLUDED.likes,
  comments = EXCLUDED.comments,
  favorites = EXCLUDED.favorites,
  shares = EXCLUDED.shares,
  orders = EXCLUDED.orders,
  revenue = EXCLUDED.revenue,
  roi = EXCLUDED.roi;

INSERT INTO selling_point_assets (id, tenant_id, name, source_type, tag, main_point, target_groups, usage_count, status, created_by)
VALUES
  ('00000000-0000-0000-0000-000000005001', '00000000-0000-0000-0000-000000000101', '宠物加热饭盒卖点包', 'manual', '宠物用品', '20 分钟快速加热，外出也能吃到温热鲜食。', '["养宠上班族","短途出行用户"]'::jsonb, 12, 'enabled', '00000000-0000-0000-0000-000000003004'),
  ('00000000-0000-0000-0000-000000005002', '00000000-0000-0000-0000-000000000102', '轻食便当盒卖点包', 'upload', '餐厨用品', '分层密封设计，减少通勤路上的串味和漏洒。', '["健身人群","通勤白领"]'::jsonb, 8, 'enabled', '00000000-0000-0000-0000-000000003001')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  source_type = EXCLUDED.source_type,
  tag = EXCLUDED.tag,
  main_point = EXCLUDED.main_point,
  target_groups = EXCLUDED.target_groups,
  usage_count = EXCLUDED.usage_count,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO selling_point_asset_items (id, asset_id, content, point_type, metadata)
VALUES
  ('00000000-0000-0000-0000-000000005101', '00000000-0000-0000-0000-000000005001', '20 分钟快速加热', 'primary', '{"source":"seed"}'::jsonb),
  ('00000000-0000-0000-0000-000000005102', '00000000-0000-0000-0000-000000005001', '分层防串味设计', 'auxiliary', '{"source":"seed"}'::jsonb),
  ('00000000-0000-0000-0000-000000005103', '00000000-0000-0000-0000-000000005002', '通勤包可轻松放下', 'auxiliary', '{"source":"seed"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  point_type = EXCLUDED.point_type,
  metadata = EXCLUDED.metadata;

INSERT INTO viral_script_assets (id, tenant_id, name, source_type, asset_kind, platform, source_url, script_text, structure_formula, shot_report, tags, usage_count, status, created_by)
VALUES
  ('00000000-0000-0000-0000-000000005201', '00000000-0000-0000-0000-000000000101', '宠物用品剧情反转脚本', 'upload', 'script', '抖音', NULL, '开场误会宠物挑食，转入加热饭盒解决鲜食温度问题，结尾轻 CTA。', '误会冲突 -> 产品救场 -> 情绪反转 -> 轻 CTA', '{"shots":4,"tone":"轻剧情"}'::jsonb, '["宠物用品","剧情反转"]'::jsonb, 6, 'enabled', '00000000-0000-0000-0000-000000003004'),
  ('00000000-0000-0000-0000-000000005202', '00000000-0000-0000-0000-000000000102', '小红书测评拉片报告', 'upload', 'shot_report', '小红书', NULL, NULL, '开箱 -> 实测 -> 总结推荐', '{"opening":"开箱展示","proof":"三项实测","cta":"收藏清单"}'::jsonb, '["测评","拉片报告"]'::jsonb, 4, 'enabled', '00000000-0000-0000-0000-000000003001')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  source_type = EXCLUDED.source_type,
  asset_kind = EXCLUDED.asset_kind,
  platform = EXCLUDED.platform,
  source_url = EXCLUDED.source_url,
  script_text = EXCLUDED.script_text,
  structure_formula = EXCLUDED.structure_formula,
  shot_report = EXCLUDED.shot_report,
  tags = EXCLUDED.tags,
  usage_count = EXCLUDED.usage_count,
  status = EXCLUDED.status,
  updated_at = now();

-- =========================
-- 8. 示例操作日志
-- =========================

INSERT INTO operation_logs (id, tenant_id, user_id, module, action, target_type, target_id, request_payload, result, ip_address, user_agent, created_at)
VALUES
  ('00000000-0000-0000-0000-000000006001', NULL, '00000000-0000-0000-0000-000000003001', '动态菜单配置', '初始化菜单', 'admin_menus', NULL, '{"source":"seed"}'::jsonb, 'success', '127.0.0.1', 'seed.sql', now()),
  ('00000000-0000-0000-0000-000000006002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000003002', '用户管理', '创建品牌管理员', 'users', '00000000-0000-0000-0000-000000003002', '{"source":"seed"}'::jsonb, 'success', '127.0.0.1', 'seed.sql', now())
ON CONFLICT (id) DO UPDATE SET
  module = EXCLUDED.module,
  action = EXCLUDED.action,
  request_payload = EXCLUDED.request_payload,
  result = EXCLUDED.result,
  created_at = EXCLUDED.created_at;

COMMIT;
