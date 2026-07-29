-- AI Script MySQL seed data
-- Execute after doc/global-database/mysql/ai_script_mysql_schema.sql.
-- Default dev password is 123456 because AuthServiceImpl keeps a fallback for hashes containing replace_with_bcrypt_hash.
-- Replace password_hash with real BCrypt hashes before production.

USE ai_script;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================
-- 0. Site config
-- =========================

INSERT INTO sys_site_config (
  id, config_code, front_home_logo_url, front_home_logo_key, front_viral_simple_analysis_example, front_viral_deep_analysis_example, front_original_scenario_prompts, status
) VALUES (
  1, 'default', NULL, NULL,
  '示例：开场用痛点提问抓注意力；中段用场景复现放大需求；结尾提炼卖点并给出行动引导。',
  '示例：从封面、标题、人物造型、文案节奏、结构公式、剪辑风格六个维度拆解爆款内容。',
  '[{"id":"main-image","title":"电商主图","prompt":"请生成电商主图短视频脚本，重点突出产品第一卖点、视觉冲击、使用场景和下单理由，开头3秒必须快速抓住注意力。"},{"id":"unboxing","title":"产品开箱","prompt":"请生成产品开箱脚本，按照开箱期待、外观细节、核心配件、上手体验、惊喜卖点和购买建议展开。"},{"id":"pain-point","title":"人群痛点产品介绍","prompt":"请围绕目标人群痛点生成产品介绍脚本，先描述真实痛点和使用困扰，再自然引出产品解决方案、关键卖点和转化引导。"},{"id":"product-intro","title":"产品介绍口播","prompt":"请生成产品介绍口播脚本，语言自然直接，包含产品定位、适用人群、核心卖点、使用方法和购买理由。"},{"id":"unboxing-oral","title":"产品开箱口播","prompt":"请生成产品开箱口播脚本，以第一视角表达开箱过程，突出真实感、细节观察、即时体验和种草氛围。"},{"id":"guide","title":"选购攻略/科普","prompt":"请生成选购攻略或科普类脚本，先提出用户常见误区，再给出判断标准，最后带出产品优势和适合购买的人群。"},{"id":"review","title":"测评","prompt":"请生成真实测评脚本，包含测试方法、使用前后对比、优缺点说明、适合人群和购买建议，表达要可信。"},{"id":"vlog","title":"vlog","prompt":"请生成生活方式 vlog 脚本，把产品自然融入一天中的真实场景，强调情绪、氛围、使用过程和生活改善。"},{"id":"desire","title":"氛围欲望激发","prompt":"请生成氛围感和欲望激发型脚本，重点营造画面、情绪、身份感和拥有后的理想状态，弱化硬广感。"}]',
  1
) ON DUPLICATE KEY UPDATE
  config_code = VALUES(config_code),
  front_viral_simple_analysis_example = VALUES(front_viral_simple_analysis_example),
  front_viral_deep_analysis_example = VALUES(front_viral_deep_analysis_example),
  front_original_scenario_prompts = VALUES(front_original_scenario_prompts),
  status = VALUES(status);

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value, value_type, description, sort_order, status
) VALUES
  (NULL, 'group', 'page-visual', 'visual', '页面视觉', NULL, 'string', '用户端页面图标、图片和文案配置', 10, 1),
  (NULL, 'group', 'script-generator', 'content', '脚本生成器', NULL, 'string', '脚本生成器案例与提示词配置', 20, 1)
ON DUPLICATE KEY UPDATE
  config_name = VALUES(config_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

SET @visual_root_id = (SELECT id FROM sys_config_item WHERE config_key = 'visual' LIMIT 1);
SET @content_root_id = (SELECT id FROM sys_config_item WHERE config_key = 'content' LIMIT 1);

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value, value_type, description, sort_order, status
) VALUES
  (@visual_root_id, 'group', 'page-visual', 'visual.home', '主页视觉', NULL, 'string', '主页品牌、导航、快捷入口和作品配置', 10, 1),
  (@visual_root_id, 'group', 'page-visual', 'visual.script-generator', '脚本生成器视觉', NULL, 'string', '脚本生成器品牌区和入口配置', 20, 1),
  (@content_root_id, 'group', 'script-generator', 'content.viral', '爆款复刻管理', NULL, 'string', '爆款解析案例配置', 10, 1),
  (@content_root_id, 'group', 'script-generator', 'content.original', 'AI智能脚本管理', NULL, 'string', 'AI智能脚本分类提示词配置', 20, 1)
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  config_name = VALUES(config_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

SET @visual_home_id = (SELECT id FROM sys_config_item WHERE config_key = 'visual.home' LIMIT 1);
SET @visual_script_id = (SELECT id FROM sys_config_item WHERE config_key = 'visual.script-generator' LIMIT 1);
SET @content_viral_id = (SELECT id FROM sys_config_item WHERE config_key = 'content.viral' LIMIT 1);
SET @content_original_id = (SELECT id FROM sys_config_item WHERE config_key = 'content.original' LIMIT 1);

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value, value_type, description, sort_order, status
)
SELECT @visual_home_id, 'item', 'page-visual', 'site.home.logo.url', '首页品牌图标 URL',
       front_home_logo_url, 'string', '用户端左侧栏顶部品牌图标地址', 10, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @visual_home_id, 'item', 'page-visual', 'site.home.logo.key', '首页品牌图标存储 Key',
       front_home_logo_key, 'string', '品牌图标对象存储 Key', 20, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @visual_home_id, 'item', 'page-visual', 'visual.home.config', '主页视觉配置',
       CAST(front_home_visual_config AS CHAR), 'json', '主页导航、快捷入口和作品配置', 30, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @visual_script_id, 'item', 'page-visual', 'visual.script-generator.config', '脚本生成器视觉配置',
       CAST(front_script_visual_config AS CHAR), 'json', '脚本生成器图标与文案配置', 10, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @content_viral_id, 'item', 'script-generator', 'content.viral.simple-analysis-example', '简易文案解析案例',
       front_viral_simple_analysis_example, 'text', '爆款复刻简易文案解析示例', 10, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @content_viral_id, 'item', 'script-generator', 'content.viral.deep-analysis-example', '深度拉片解析案例',
       front_viral_deep_analysis_example, 'text', '爆款复刻深度拉片解析示例', 20, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @content_original_id, 'item', 'script-generator', 'content.original.scenario-prompts', 'AI智能脚本分类提示词',
       CAST(front_original_scenario_prompts AS CHAR), 'json', 'AI智能脚本大类和子类提示词配置', 10, 1
FROM sys_site_config WHERE config_code = 'default'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  config_name = VALUES(config_name),
  config_value = COALESCE(VALUES(config_value), config_value),
  value_type = VALUES(value_type),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

INSERT INTO sys_home_banner (
  id, title, subtitle, image_url, image_key, link_url, sort_order, status
) VALUES
  (1, 'Seedance 2.0 上线', '解锁真人生成 丝滑无需排队', NULL, NULL, '/workspace', 10, 1),
  (2, '纳米大片挑战赛', 'AI 驱动的商业短视频脚本生成', NULL, NULL, '/workspace', 20, 1),
  (3, '纳米 Image 2.0 超清图片模型上线', '画质提升 精准编辑 超强思考 文字渲染', NULL, NULL, '/workspace', 30, 1)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  subtitle = VALUES(subtitle),
  link_url = VALUES(link_url),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

-- =========================
-- 1. Default tenant and users
-- =========================

INSERT INTO sys_tenant (
  id, tenant_name, tenant_code, contact_name, contact_phone, contact_email, status, plan_code
) VALUES (
  1, '默认品牌', 'default', '系统管理员', '13800000000', 'admin@ai-script.local', 1, 'standard'
) ON DUPLICATE KEY UPDATE
  tenant_name = VALUES(tenant_name),
  contact_name = VALUES(contact_name),
  contact_phone = VALUES(contact_phone),
  contact_email = VALUES(contact_email),
  status = VALUES(status),
  plan_code = VALUES(plan_code);

INSERT INTO sys_user (
  id, tenant_id, username, account, password_hash, user_type, member_level, status
) VALUES
  (1, 1, '超级管理员', 'admin@ai-script.local', '$2a$10$replace_with_bcrypt_hash', 'admin', 0, 1),
  (2, 1, '演示用户', 'demo@ai-script.local', '$2a$10$replace_with_bcrypt_hash', 'front', 1, 1),
  (3, 1, '协作编导', 'collab@ai-script.local', '$2a$10$replace_with_bcrypt_hash', 'front', 1, 1)
ON DUPLICATE KEY UPDATE
  tenant_id = VALUES(tenant_id),
  username = VALUES(username),
  user_type = VALUES(user_type),
  member_level = VALUES(member_level),
  status = VALUES(status);

-- =========================
-- 2. Roles
-- =========================

INSERT INTO sys_role (
  id, tenant_id, role_name, role_code, description, is_system, status
) VALUES
  (1, NULL, '超级管理员', 'super_admin', '系统最高权限', 1, 1),
  (2, 1, '运营管理员', 'admin_operator', '后台运营管理角色', 1, 1),
  (3, 1, '普通用户', 'front_user', '前台用户默认角色', 1, 1)
ON DUPLICATE KEY UPDATE
  role_name = VALUES(role_name),
  description = VALUES(description),
  is_system = VALUES(is_system),
  status = VALUES(status);

INSERT INTO sys_user_role (user_id, role_id) VALUES
  (1, 1),
  (2, 3),
  (3, 3)
ON DUPLICATE KEY UPDATE
  create_time = create_time;

-- =========================
-- 3. Menu permissions
-- =========================

INSERT INTO sys_permission (
  id, permission_name, permission_code, module_code, permission_type, path, parent_id, icon, sort_order, status
) VALUES
  (1, '仪表盘', 'menu:dashboard', 'dashboard', 'menu', '/admin/dashboard', NULL, 'layout-dashboard', 10, 1),
  (2, '用户管理', 'menu:user', 'user', 'menu', '/admin/users', NULL, 'users', 20, 1),
  (3, '项目管理', 'menu:project', 'project', 'menu', '/admin/projects', NULL, 'folder-kanban', 30, 1),
  (4, '脚本模板', 'menu:template', 'template', 'menu', '/admin/templates', NULL, 'file-text', 40, 1),
  (5, '审核任务', 'menu:audit', 'audit', 'menu', '/admin/audit', NULL, 'shield-check', 50, 1),
  (6, '合规词库', 'menu:compliance', 'compliance', 'menu', '/admin/compliance', NULL, 'badge-alert', 60, 1),
  (7, '系统管理', 'menu:system', 'system', 'menu', '/admin/system', NULL, 'settings', 70, 1),
  (8, 'Provider配置', 'menu:system:provider', 'system', 'menu', '/admin/system/providers', 7, 'plug', 71, 1),
  (9, 'Prompt模板', 'menu:system:prompt', 'system', 'menu', '/admin/system/prompt-templates', 7, 'message-square-text', 72, 1),
  (10, '导入模板', 'menu:system:import-template', 'system', 'menu', '/admin/system/import-templates', 7, 'table-properties', 73, 1),
  (11, '角色权限', 'menu:system:role', 'system', 'menu', '/admin/system/roles', 7, 'key-round', 74, 1),
  (12, '操作日志', 'menu:system:operation-log', 'system', 'menu', '/admin/system/operation-logs', 7, 'scroll-text', 75, 1),
  (13, '通知中心', 'menu:notification', 'notification', 'menu', '/admin/notifications', NULL, 'bell', 80, 1),
  (14, '站点配置', 'menu:system:site-config', 'system', 'menu', '/admin/system/site-config', 7, 'settings', 76, 1),
  (15, '首页轮播', 'menu:system:home-banner', 'system', 'menu', '/admin/system/home-banners', 7, 'image', 77, 1)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  module_code = VALUES(module_code),
  permission_type = VALUES(permission_type),
  path = VALUES(path),
  parent_id = VALUES(parent_id),
  icon = VALUES(icon),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

-- =========================
-- 4. Admin API permissions
-- =========================

INSERT INTO sys_permission (
  id, permission_name, permission_code, module_code, permission_type, path, parent_id, icon, sort_order, status
) VALUES
  (101, '查看仪表盘', 'admin:dashboard:view', 'dashboard', 'api', '/api/admin/dashboard/**', NULL, NULL, 1001, 1),
  (102, '管理用户', 'admin:user:manage', 'user', 'api', '/api/admin/users/**', NULL, NULL, 1002, 1),
  (103, '管理项目', 'admin:project:manage', 'project', 'api', '/api/admin/projects/**', NULL, NULL, 1003, 1),
  (104, '管理脚本模板', 'admin:template:manage', 'template', 'api', '/api/admin/templates/**', NULL, NULL, 1004, 1),
  (105, '管理审核任务', 'admin:audit:manage', 'audit', 'api', '/api/admin/audit/tasks/**', NULL, NULL, 1005, 1),
  (106, '管理合规词库', 'admin:compliance:manage', 'compliance', 'api', '/api/admin/compliance/words/**', NULL, NULL, 1006, 1),
  (107, '管理Provider配置', 'admin:provider:manage', 'system', 'api', '/api/admin/providers/**', NULL, NULL, 1007, 1),
  (108, '管理Prompt模板', 'admin:system:prompt:manage', 'system', 'api', '/api/admin/system/prompt-templates/**', NULL, NULL, 1008, 1),
  (109, '管理导入模板', 'admin:system:import-template:manage', 'system', 'api', '/api/admin/system/import-templates/**', NULL, NULL, 1009, 1),
  (110, '管理角色', 'admin:system:role:manage', 'system', 'api', '/api/admin/system/roles/**', NULL, NULL, 1010, 1),
  (111, '管理权限菜单', 'admin:system:permission:manage', 'system', 'api', '/api/admin/system/permissions/**', NULL, NULL, 1011, 1),
  (112, '管理用户角色', 'admin:system:user-role:manage', 'system', 'api', '/api/admin/system/users/*/roles', NULL, NULL, 1012, 1),
  (113, '查看操作日志', 'admin:operation-log:view', 'system', 'api', '/api/admin/operation-logs/**', NULL, NULL, 1013, 1),
  (114, '管理通知', 'admin:notification:manage', 'notification', 'api', '/api/admin/notifications/**', NULL, NULL, 1014, 1),
  (115, '管理站点配置', 'admin:system:site-config:manage', 'system', 'api', '/api/admin/system/site-config', NULL, NULL, 1015, 1),
  (116, '后台文件上传', 'admin:file:upload', 'asset', 'api', '/api/files/upload', NULL, NULL, 1016, 1),
  (117, '管理首页轮播', 'admin:system:home-banner:manage', 'system', 'api', '/api/admin/system/home-banners/**', NULL, NULL, 1017, 1)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  module_code = VALUES(module_code),
  permission_type = VALUES(permission_type),
  path = VALUES(path),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

-- =========================
-- 5. Front API permissions
-- =========================

INSERT INTO sys_permission (
  id, permission_name, permission_code, module_code, permission_type, path, parent_id, icon, sort_order, status
) VALUES
  (201, '项目管理', 'front:project:manage', 'project', 'api', '/api/projects/**', NULL, NULL, 2001, 1),
  (202, 'Brief管理', 'front:brief:manage', 'brief', 'api', '/api/briefs/**', NULL, NULL, 2002, 1),
  (203, '脚本管理', 'front:script:manage', 'script', 'api', '/api/scripts/**', NULL, NULL, 2003, 1),
  (204, '分镜管理', 'front:storyboard:manage', 'storyboard', 'api', '/api/storyboards/**', NULL, NULL, 2004, 1),
  (205, '素材管理', 'front:asset:manage', 'asset', 'api', '/api/assets/**', NULL, NULL, 2005, 1),
  (206, '卖点资产管理', 'front:selling-point-asset:manage', 'asset', 'api', '/api/selling-point-assets/**', NULL, NULL, 2006, 1),
  (207, '爆款资产管理', 'front:viral-asset:manage', 'asset', 'api', '/api/viral-assets/**', NULL, NULL, 2007, 1),
  (208, '来源分析查询', 'front:source:view', 'source', 'api', '/api/source-analysis', NULL, NULL, 2008, 1),
  (209, '分享链接解析', 'front:source:parse', 'source', 'api', '/api/video/share-url/parse', NULL, NULL, 2009, 1),
  (210, '文案提取', 'front:source:extract-copy', 'source', 'api', '/api/script-generator/extract-copy', NULL, NULL, 2010, 1),
  (211, '文件上传', 'front:file:upload', 'asset', 'api', '/api/files/**', NULL, NULL, 2011, 1),
  (212, '合规检测', 'front:compliance:check', 'compliance', 'api', '/api/compliance/**', NULL, NULL, 2012, 1),
  (213, '提交审核', 'front:audit:submit', 'audit', 'api', '/api/audit/tasks', NULL, NULL, 2013, 1),
  (214, '任务查询', 'front:task:view', 'generation', 'api', '/api/tasks/**', NULL, NULL, 2014, 1),
  (215, '会员查询', 'front:membership:view', 'membership', 'api', '/api/membership/**', NULL, NULL, 2015, 1),
  (216, '支付订单', 'front:payment:manage', 'payment', 'api', '/api/payments/**', NULL, NULL, 2016, 1),
  (217, '通知读取', 'front:notification:read', 'notification', 'api', '/api/notifications/**', NULL, NULL, 2017, 1)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  module_code = VALUES(module_code),
  permission_type = VALUES(permission_type),
  path = VALUES(path),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

-- =========================
-- 6. Role permissions
-- =========================

INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 1, id FROM sys_permission
ON DUPLICATE KEY UPDATE create_time = sys_role_permission.create_time;

INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 2, id FROM sys_permission
WHERE permission_code LIKE 'menu:%'
   OR permission_code LIKE 'admin:%'
ON DUPLICATE KEY UPDATE create_time = sys_role_permission.create_time;

INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 3, id FROM sys_permission
WHERE permission_code LIKE 'front:%'
ON DUPLICATE KEY UPDATE create_time = sys_role_permission.create_time;

-- =========================
-- 7. Base business seed data
-- =========================

INSERT INTO ai_membership_plan (
  id, plan_code, plan_name, period_days, price, benefits_json, status
) VALUES
  (1, 'pro_month', '月度会员', 30, 39.00, JSON_OBJECT('scriptQuota', 100, 'videoExport', true), 1),
  (2, 'pro_quarter', '季度会员', 90, 99.00, JSON_OBJECT('scriptQuota', 360, 'videoExport', true), 1),
  (3, 'pro_year', '年度会员', 365, 299.00, JSON_OBJECT('scriptQuota', 1600, 'videoExport', true, 'priorityQueue', true), 1)
ON DUPLICATE KEY UPDATE
  plan_name = VALUES(plan_name),
  period_days = VALUES(period_days),
  price = VALUES(price),
  benefits_json = VALUES(benefits_json),
  status = VALUES(status);

INSERT INTO ai_script_template (
  id, tenant_id, template_name, category, actor, people, popularity, difficulty,
  paragraph_structure, emotion_turning_points, first_five_seconds_hook, structure_formula, sort_order, locked, status
) VALUES
  (1, NULL, '痛点解决型', '产品介绍', '女', '1人', '高', '简单',
   '段落 | 内容要点\n痛点开场 | 直接点出目标人群高频困扰\n场景放大 | 放大问题对生活/工作的影响\n产品解决 | 引出产品核心卖点\n效果展示 | 展示使用后变化\n行动引导 | 给出明确购买/咨询理由',
   '焦虑痛点 -> 被理解的共鸣 -> 看到解决方案的安心 -> 效果可信任 -> 立即行动',
   '你是不是也经常遇到这个问题？先用一句具体痛点抓住注意力。',
   '痛点开场 -> 场景放大 -> 产品解决 -> 效果展示 -> 行动引导', 1, 0, 1),
  (2, NULL, '功能讲解型', '产品介绍', '男', '1人', '高', '简单',
   '段落 | 内容要点\n功能引入 | 用需求场景引出功能\n使用演示 | 展示操作步骤\n细节证明 | 强调关键细节和差异\n用户收益 | 说明用户获得的价值\n行动引导 | 引导试用/下单',
   '好奇功能 -> 理解用法 -> 认可细节 -> 感知收益 -> 愿意尝试',
   '这个功能很多人没用对，5 秒说清它解决什么问题。',
   '功能引入 -> 使用演示 -> 细节证明 -> 用户收益 -> 行动引导', 2, 0, 1),
  (3, NULL, '对比突出型', '创意剧情', '男女', '2人', '中', '中等',
   '段落 | 内容要点\n旧方案痛点 | 展示原有做法的不便\n新旧对比 | 同场景对比两种方案\n产品亮点 | 突出新方案优势\n结果反差 | 展现效果差距\n行动引导 | 强化选择理由',
   '困扰无奈 -> 对比惊讶 -> 发现亮点 -> 结果信服 -> 产生选择冲动',
   '同样一个问题，为什么别人解决得更轻松？用对比制造悬念。',
   '旧方案痛点 -> 新旧对比 -> 产品亮点 -> 结果反差 -> 行动引导', 3, 0, 1)
ON DUPLICATE KEY UPDATE
  template_name = VALUES(template_name),
  category = VALUES(category),
  paragraph_structure = VALUES(paragraph_structure),
  emotion_turning_points = VALUES(emotion_turning_points),
  first_five_seconds_hook = VALUES(first_five_seconds_hook),
  structure_formula = VALUES(structure_formula),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

INSERT INTO sys_prompt_template (
  id, tenant_id, provider_id, scene_code, template_name, version_no, system_prompt, user_prompt, response_schema, status
) VALUES
  (1, NULL, NULL, 'script_generate', '短视频脚本生成默认Prompt', 'v1', '你是专业商业短视频脚本策划，请输出可拍摄、可审核的短视频脚本。', '请基于以下产品卖点、目标人群、投放平台生成短视频脚本：{{brief}}', JSON_OBJECT('type', 'object'), 1),
  (21, NULL, NULL, 'script_generate_viral', '爆款复刻脚本生成Prompt', 'v1', '你是专业商业短视频爆款复刻脚本策划。严格按照后台规范生成脚本，不输出解释、变量说明、假设说明或占位符。', '请结合爆款参考文案、结构分析、产品Brief和脚本配置，生成可拍摄的爆款复刻脚本。', JSON_OBJECT('type', 'object'), 1),
  (22, NULL, NULL, 'script_generate_template', '脚本模板库生成Prompt', 'v1', '你是专业商业短视频模板脚本策划。严格按照后台规范和所选模板生成脚本，不输出解释、变量说明、假设说明或占位符。', '请结合所选模板信息、产品Brief和脚本配置，生成可拍摄的模板脚本。', JSON_OBJECT('type', 'object'), 1),
  (23, NULL, NULL, 'script_generate_original', 'AI原创脚本生成Prompt', 'v1', '你是专业商业短视频原创脚本策划。严格按照后台规范生成脚本，不输出解释、变量说明、假设说明或占位符。', '请结合用户创作需求、产品Brief和脚本配置，生成可拍摄的原创脚本。', JSON_OBJECT('type', 'object'), 1),
  (24, NULL, NULL, 'source_copy_analyze', '爆款文案结构分析Prompt', 'v1', '你是商业短视频爆款文案结构分析专家。请只输出中文分析结果，便于后续生成带货脚本。', '请根据分析模式和原始文案，输出可复刻的结构分析。要求简洁、具体、可直接用于后续脚本生成。', JSON_OBJECT('type', 'object'), 1),
  (25, NULL, NULL, 'source_copy_cleanup', 'ASR文案整理Prompt', 'v3', '你是专业的短视频ASR逐字稿校对员。这份逐字稿将用于拆解爆款文案，必须忠实保留每一个原始口语信息。你只能纠正上下文完全明确的明显同音错字、补充标点和按语义分段；不得删除、改写、调换、概括或补充任何词语。只输出整理后的纯文本，不要标题、说明、Markdown或JSON。', '请整理下面的短视频ASR原始逐字稿：\n\n{{copy}}\n\n整理要求（必须全部遵守）：\n1. 只纠正上下文完全明确的同音、近音造成的明显错别字；不确定时保持原样，不得润色；\n2. 严禁删减任何内容。所有口头禅、重复词、填充词（例如“那个、然后、就是、嗯、啊”）、语气词、口吃、卡顿、倒装以及没说完的话，都必须原样保留；\n3. 在不删减、不合并、不调整词语顺序的前提下分段。每个以“。！？；”结束的完整句子必须单独占一行；同一句内部的逗号停顿不得强制换行；\n4. 标点必须体现原始口语语气：疑问使用“？”，感叹使用“！”，句中停顿使用“，”或“、”；只有完整陈述句才使用“。”，严禁把所有句子统一处理成句号结尾；\n5. 不总结、不概括、不分析、不改写、不重新组织，也不得添加原文没有的信息；\n6. 只返回整理后的完整文案，不要附带任何说明或标记。', NULL, 1),
  (2, NULL, NULL, 'brief_score', 'Brief评分默认Prompt', 'v1', '你是短视频商业Brief评估专家。', '请对以下Brief进行完整度、差异化、风险点评分：{{brief}}', JSON_OBJECT('type', 'object'), 1)
ON DUPLICATE KEY UPDATE
  template_name = VALUES(template_name),
  system_prompt = VALUES(system_prompt),
  user_prompt = VALUES(user_prompt),
  response_schema = VALUES(response_schema),
  status = VALUES(status);

INSERT INTO sys_import_template_config (
  id, template_type, template_name, download_file_name, template_file_key, template_file_url, columns_json, sample_rows_json, description, status
) VALUES
  (1, 'selling_point', '卖点导入模板', 'selling-point-template.xlsx', NULL, NULL, JSON_ARRAY('产品名称', '产品型号', '产品价格', '产品Slogan', '目标人群', '产品特色卖点', '产品主要卖点', '产品次要卖点', '使用场景'), JSON_ARRAY(JSON_OBJECT('产品名称', '样例产品A60MAX', '产品型号', 'A60MAX', '产品价格', '11900元', '产品Slogan', '万元级专业拉伸按摩椅', '目标人群', '久坐办公族;运动健身人群', '产品特色卖点', '行业首款双拉伸按摩椅', '产品主要卖点', '真4D灵犀机芯;柔性黄金导轨', '产品次要卖点', '加热;蓝牙音箱;零重力', '使用场景', '客厅追剧;运动后恢复;父母养生')), '用于批量导入产品卖点Brief', 1),
  (2, 'viral_script', '爆款脚本导入模板', 'viral-script-template.xlsx', NULL, NULL, JSON_ARRAY('assetName', 'platform', 'sourceUrl', 'scriptText', 'structureFormula'), JSON_ARRAY(JSON_OBJECT('assetName', '爆款样例', 'platform', 'douyin', 'sourceUrl', 'https://example.com', 'scriptText', '脚本文案', 'structureFormula', '结构公式')), '用于批量导入爆款脚本资产库', 1)
ON DUPLICATE KEY UPDATE
  template_name = VALUES(template_name),
  download_file_name = VALUES(download_file_name),
  template_file_key = VALUES(template_file_key),
  template_file_url = VALUES(template_file_url),
  columns_json = VALUES(columns_json),
  sample_rows_json = VALUES(sample_rows_json),
  description = VALUES(description),
  status = VALUES(status);

INSERT INTO sys_script_format_config (
  code, name, format_requirement, sort_order, status
) VALUES
  ('storyboard', '分镜脚本表', '请按分镜脚本表输出，至少包含镜号、时长、画面/镜头、人物动作、台词/旁白、字幕、音效/音乐、道具/备注等信息，便于拍摄执行。', 10, 1),
  ('oral', '口播脚本', '请按口播脚本输出，突出开场钩子、痛点共鸣、产品卖点、信任背书和行动引导，语言口语化、节奏紧凑、适合真人出镜直接朗读。', 20, 1),
  ('shot', '拍摄脚本', '请按拍摄脚本输出，明确拍摄场景、机位/景别、镜头运动、演员调度、画面重点、台词字幕和后期提示，保证现场可执行。', 30, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  format_requirement = VALUES(format_requirement),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

SET FOREIGN_KEY_CHECKS = 1;
