-- AI Script MySQL global schema
-- 技术栈：Spring Boot 3.x + MyBatis-Plus + MySQL 8.0
-- 主键策略：数据库 AUTO_INCREMENT 自增 ID，数据库字段使用 BIGINT。

CREATE DATABASE IF NOT EXISTS ai_script
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE ai_script;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================
-- 1. 系统、租户、用户、权限
-- =========================

DROP TABLE IF EXISTS sys_tenant;
CREATE TABLE sys_tenant (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_name VARCHAR(120) NOT NULL COMMENT '租户/品牌名称',
  tenant_code VARCHAR(80) NOT NULL COMMENT '租户编码',
  contact_name VARCHAR(80) DEFAULT NULL COMMENT '联系人',
  contact_phone VARCHAR(40) DEFAULT NULL COMMENT '联系电话',
  contact_email VARCHAR(160) DEFAULT NULL COMMENT '联系邮箱',
  domain VARCHAR(160) DEFAULT NULL COMMENT '专属域名',
  logo_url VARCHAR(500) DEFAULT NULL COMMENT '品牌Logo',
  theme_key VARCHAR(40) DEFAULT 'default' COMMENT '主题标识',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用 2试用',
  plan_code VARCHAR(40) DEFAULT 'standard' COMMENT '套餐编码',
  storage_quota_bytes BIGINT DEFAULT 0 COMMENT '存储配额',
  start_time DATETIME DEFAULT NULL COMMENT '开通时间',
  expire_time DATETIME DEFAULT NULL COMMENT '到期时间',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0否 1是',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_tenant_code (tenant_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户/品牌表';

DROP TABLE IF EXISTS sys_user;
CREATE TABLE sys_user (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID',
  username VARCHAR(80) NOT NULL COMMENT '用户名',
  account VARCHAR(160) NOT NULL COMMENT '登录账号',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  phone VARCHAR(40) DEFAULT NULL COMMENT '手机号',
  email VARCHAR(160) DEFAULT NULL COMMENT '邮箱',
  wechat_open_id VARCHAR(128) DEFAULT NULL COMMENT '微信开放平台 OpenID',
  wechat_union_id VARCHAR(128) DEFAULT NULL COMMENT '微信开放平台 UnionID',
  avatar_url VARCHAR(500) DEFAULT NULL COMMENT '头像',
  user_type VARCHAR(32) NOT NULL DEFAULT 'front' COMMENT '用户类型：front/admin',
  member_level INT NOT NULL DEFAULT 0 COMMENT '会员等级',
  internal_account TINYINT NOT NULL DEFAULT 0 COMMENT '内部员工账号：0否 1是',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  last_login_time DATETIME DEFAULT NULL COMMENT '最近登录时间',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_user_account (account),
  KEY idx_sys_user_tenant (tenant_id),
  KEY idx_sys_user_phone (phone),
  KEY idx_sys_user_email (email),
  KEY idx_sys_user_internal (internal_account, status),
  UNIQUE KEY uk_sys_user_wechat_open_id (wechat_open_id),
  KEY idx_sys_user_wechat_union_id (wechat_union_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表，包含前台用户和后台管理员';

DROP TABLE IF EXISTS sys_role;
CREATE TABLE sys_role (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID，NULL表示系统角色',
  role_name VARCHAR(80) NOT NULL COMMENT '角色名称',
  role_code VARCHAR(80) NOT NULL COMMENT '角色编码',
  description VARCHAR(255) DEFAULT NULL COMMENT '描述',
  is_system TINYINT NOT NULL DEFAULT 0 COMMENT '是否系统内置',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_role_tenant_code (tenant_id, role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

DROP TABLE IF EXISTS sys_permission;
CREATE TABLE sys_permission (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  permission_name VARCHAR(120) NOT NULL COMMENT '权限名称',
  permission_code VARCHAR(160) NOT NULL COMMENT '权限编码',
  module_code VARCHAR(80) NOT NULL COMMENT '模块编码',
  permission_type VARCHAR(32) NOT NULL DEFAULT 'button' COMMENT '权限类型：menu/button/api',
  path VARCHAR(255) DEFAULT NULL COMMENT '菜单或接口路径',
  parent_id INT DEFAULT NULL COMMENT '父级权限ID',
  icon VARCHAR(80) DEFAULT NULL COMMENT '图标',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_permission_code (permission_code),
  KEY idx_sys_permission_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限/菜单表';

DROP TABLE IF EXISTS sys_user_role;
CREATE TABLE sys_user_role (
  user_id INT NOT NULL COMMENT '用户ID',
  role_id INT NOT NULL COMMENT '角色ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (user_id, role_id),
  KEY idx_sys_user_role_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

DROP TABLE IF EXISTS sys_role_permission;
CREATE TABLE sys_role_permission (
  role_id INT NOT NULL COMMENT '角色ID',
  permission_id INT NOT NULL COMMENT '权限ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (role_id, permission_id),
  KEY idx_sys_role_permission_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';

DROP TABLE IF EXISTS sys_refresh_token;
CREATE TABLE sys_refresh_token (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  user_id INT NOT NULL COMMENT '用户ID',
  token_hash VARCHAR(255) NOT NULL COMMENT '刷新令牌哈希',
  expire_time DATETIME NOT NULL COMMENT '过期时间',
  revoke_time DATETIME DEFAULT NULL COMMENT '注销时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_refresh_token_hash (token_hash),
  KEY idx_sys_refresh_token_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='刷新令牌表';

DROP TABLE IF EXISTS sys_verification_code;
CREATE TABLE sys_verification_code (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  target VARCHAR(180) NOT NULL COMMENT '手机号或邮箱',
  channel VARCHAR(40) NOT NULL COMMENT '渠道：sms/email',
  scene VARCHAR(60) NOT NULL COMMENT '场景：register/login/reset',
  code_hash VARCHAR(255) NOT NULL COMMENT '验证码哈希',
  expire_time DATETIME NOT NULL COMMENT '过期时间',
  used_time DATETIME DEFAULT NULL COMMENT '使用时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_sys_verification_target_scene (target, scene, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='验证码表';

DROP TABLE IF EXISTS sys_operation_log;
CREATE TABLE sys_operation_log (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID',
  user_id INT DEFAULT NULL COMMENT '操作用户ID',
  module_code VARCHAR(80) NOT NULL COMMENT '模块',
  action_code VARCHAR(120) NOT NULL COMMENT '操作',
  target_type VARCHAR(80) DEFAULT NULL COMMENT '对象类型',
  target_id INT DEFAULT NULL COMMENT '对象ID',
  request_payload JSON DEFAULT NULL COMMENT '请求参数',
  result_status VARCHAR(32) NOT NULL DEFAULT 'success' COMMENT '结果',
  ip_address VARCHAR(64) DEFAULT NULL COMMENT 'IP',
  user_agent VARCHAR(500) DEFAULT NULL COMMENT 'UA',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_sys_operation_tenant_time (tenant_id, create_time),
  KEY idx_sys_operation_user_time (user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- =========================
-- 2. 系统配置、Provider、Prompt、导入模板
-- =========================

DROP TABLE IF EXISTS sys_config_item;
CREATE TABLE sys_config_item (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  parent_id INT DEFAULT NULL COMMENT '父节点ID，空表示根节点',
  node_type VARCHAR(16) NOT NULL DEFAULT 'item' COMMENT '节点类型：group分组/item配置项',
  group_code VARCHAR(80) NOT NULL COMMENT '所属配置模块编码',
  config_key VARCHAR(160) NOT NULL COMMENT '全局唯一配置键，使用点分层级命名',
  config_name VARCHAR(120) NOT NULL COMMENT '配置项显示名称',
  config_value LONGTEXT DEFAULT NULL COMMENT '配置值',
  value_type VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '值类型：string/text/number/boolean/json/image',
  description VARCHAR(500) DEFAULT NULL COMMENT '配置说明',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '同级排序',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_config_item_key (config_key),
  KEY idx_sys_config_item_parent_sort (parent_id, sort_order),
  KEY idx_sys_config_item_group_status (group_code, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='树形字典配置项';

DROP TABLE IF EXISTS sys_site_config;
CREATE TABLE sys_site_config (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  config_code VARCHAR(80) NOT NULL DEFAULT 'default' COMMENT '配置编码',
  front_home_logo_url VARCHAR(500) DEFAULT NULL COMMENT '前台首页Logo URL',
  front_home_logo_key VARCHAR(500) DEFAULT NULL COMMENT '前台首页Logo存储Key',
  front_viral_simple_analysis_example TEXT DEFAULT NULL COMMENT '前台爆款复刻简易文案解析案例',
  front_viral_deep_analysis_example TEXT DEFAULT NULL COMMENT '前台爆款复刻深度拉片解析案例',
  front_original_scenario_prompts JSON DEFAULT NULL COMMENT '前台AI原创脚本场景与提示词配置',
  front_home_visual_config JSON DEFAULT NULL COMMENT '前台主页导航、快捷模块与作品视觉配置',
  front_script_visual_config JSON DEFAULT NULL COMMENT '前台脚本生成器图标与文案视觉配置',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_site_config_code (config_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='旧版站点展示配置表（兼容读取，新增配置统一写入sys_config_item）';

DROP TABLE IF EXISTS sys_home_banner;
CREATE TABLE sys_home_banner (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  title VARCHAR(160) NOT NULL COMMENT '轮播标题',
  subtitle VARCHAR(300) DEFAULT NULL COMMENT '轮播副标题',
  image_url VARCHAR(1000) DEFAULT NULL COMMENT '轮播图片URL',
  image_key VARCHAR(500) DEFAULT NULL COMMENT '轮播图片存储Key',
  link_url VARCHAR(1000) DEFAULT NULL COMMENT '点击跳转地址',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序，越小越靠前',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0停用 1启用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_sys_home_banner_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页轮播图表';

DROP TABLE IF EXISTS sys_api_provider_config;
CREATE TABLE sys_api_provider_config (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID，NULL表示全局',
  provider_type VARCHAR(40) NOT NULL COMMENT '类型：llm/video_parse/asr/video/tts/pay',
  provider_name VARCHAR(120) NOT NULL COMMENT '供应商名称',
  platform VARCHAR(60) DEFAULT NULL COMMENT '平台：douyin/xiaohongshu/openai等',
  endpoint_url VARCHAR(500) DEFAULT NULL COMMENT '接口地址',
  api_key_encrypted VARCHAR(1000) DEFAULT NULL COMMENT '加密密钥或env引用',
  priority INT NOT NULL DEFAULT 100 COMMENT '优先级，越小越优先',
  rate_limit_per_minute INT DEFAULT NULL COMMENT '每分钟限流',
  timeout_ms INT NOT NULL DEFAULT 8000 COMMENT '超时毫秒',
  retry_count INT NOT NULL DEFAULT 2 COMMENT '重试次数',
  config_json JSON DEFAULT NULL COMMENT '扩展配置',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_sys_provider_type_status (provider_type, status, priority),
  KEY idx_sys_provider_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='第三方Provider配置表';

DROP TABLE IF EXISTS sys_prompt_template;
CREATE TABLE sys_prompt_template (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID，NULL表示全局',
  provider_id INT DEFAULT NULL COMMENT '绑定Provider ID',
  scene_code VARCHAR(80) NOT NULL COMMENT '场景：brief_score/brief_compare/script_generate等',
  template_name VARCHAR(160) NOT NULL COMMENT '模板名称',
  version_no VARCHAR(40) NOT NULL COMMENT '版本号',
  system_prompt TEXT DEFAULT NULL COMMENT '系统提示词',
  user_prompt TEXT NOT NULL COMMENT '用户提示词模板',
  response_schema JSON DEFAULT NULL COMMENT '返回JSON Schema',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_sys_prompt_scene_status (scene_code, status),
  KEY idx_sys_prompt_tenant_scene (tenant_id, scene_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='大模型Prompt模板表';

DROP TABLE IF EXISTS sys_import_template_config;
CREATE TABLE sys_import_template_config (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  template_type VARCHAR(80) NOT NULL COMMENT '模板类型：selling_point/viral_script',
  template_name VARCHAR(160) NOT NULL COMMENT '模板名称',
  download_file_name VARCHAR(240) NOT NULL COMMENT '下载文件名',
  template_file_key VARCHAR(500) DEFAULT NULL COMMENT '模板文件对象存储Key',
  template_file_url VARCHAR(1000) DEFAULT NULL COMMENT '模板文件访问URL快照',
  columns_json JSON NOT NULL COMMENT '字段列配置',
  sample_rows_json JSON DEFAULT NULL COMMENT '示例行',
  description TEXT DEFAULT NULL COMMENT '导入说明',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_sys_import_template_type (template_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='导入模板配置表';

DROP TABLE IF EXISTS sys_script_format_config;
CREATE TABLE sys_script_format_config (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  name VARCHAR(80) NOT NULL COMMENT '格式名称',
  code VARCHAR(40) NOT NULL COMMENT '格式编码',
  format_requirement TEXT NOT NULL COMMENT '写脚本格式要求',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序值',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_script_format_code (code),
  KEY idx_sys_script_format_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本格式配置表';

DROP TABLE IF EXISTS sys_notification;
CREATE TABLE sys_notification (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID',
  user_id INT DEFAULT NULL COMMENT '接收用户ID',
  channel VARCHAR(40) NOT NULL DEFAULT 'system' COMMENT '通知渠道',
  biz_type VARCHAR(60) DEFAULT NULL COMMENT '业务类型，用于通知去重与跳转',
  biz_id VARCHAR(180) DEFAULT NULL COMMENT '业务唯一标识',
  title VARCHAR(180) NOT NULL COMMENT '标题',
  content TEXT DEFAULT NULL COMMENT '内容',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0未读 1已读',
  read_time DATETIME DEFAULT NULL COMMENT '阅读时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_notification_biz (user_id, channel, biz_type, biz_id),
  KEY idx_sys_notification_user_status (user_id, status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统通知表';

-- =========================
-- 3. 项目与工作流
-- =========================

DROP TABLE IF EXISTS ai_project;
CREATE TABLE ai_project (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  owner_id INT NOT NULL COMMENT '项目创建人',
  project_name VARCHAR(180) NOT NULL COMMENT '项目名称',
  category VARCHAR(80) DEFAULT NULL COMMENT '项目分类',
  product_name VARCHAR(180) DEFAULT NULL COMMENT '产品名称',
  platform VARCHAR(60) DEFAULT NULL COMMENT '投放平台',
  video_ratio VARCHAR(20) DEFAULT NULL COMMENT '视频比例',
  video_type VARCHAR(60) DEFAULT NULL COMMENT '视频类型',
  status VARCHAR(40) NOT NULL DEFAULT 'active' COMMENT '状态：active/published/review/idle/draft/archived',
  current_step VARCHAR(60) NOT NULL DEFAULT 'selling-points' COMMENT '当前步骤',
  progress INT NOT NULL DEFAULT 0 COMMENT '进度百分比',
  brief_count INT NOT NULL DEFAULT 0 COMMENT 'Brief数量',
  script_count INT NOT NULL DEFAULT 0 COMMENT '脚本数量',
  video_count INT NOT NULL DEFAULT 0 COMMENT '视频数量',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_project_tenant_update (tenant_id, update_time),
  KEY idx_ai_project_owner (owner_id),
  KEY idx_ai_project_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';

DROP TABLE IF EXISTS ai_project_step;
CREATE TABLE ai_project_step (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  step_key VARCHAR(60) NOT NULL COMMENT '步骤key',
  step_name VARCHAR(80) NOT NULL COMMENT '步骤名称',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/doing/done',
  draft_data JSON DEFAULT NULL COMMENT '步骤草稿数据',
  complete_time DATETIME DEFAULT NULL COMMENT '完成时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_project_step (project_id, step_key),
  KEY idx_ai_project_step_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目步骤状态表';

-- =========================
-- 4. Brief、卖点、资产库
-- =========================

DROP TABLE IF EXISTS ai_brief;
CREATE TABLE ai_brief (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  brief_name VARCHAR(180) NOT NULL COMMENT 'Brief名称',
  product_name VARCHAR(180) DEFAULT NULL COMMENT '产品名称',
  product_model VARCHAR(120) DEFAULT NULL COMMENT '产品型号',
  price VARCHAR(80) DEFAULT NULL COMMENT '价格',
  slogan VARCHAR(255) DEFAULT NULL COMMENT '产品slogan',
  primary_selling_point TEXT DEFAULT NULL COMMENT '主卖点',
  target_audience TEXT DEFAULT NULL COMMENT '目标人群',
  target_scene TEXT DEFAULT NULL COMMENT '目标场景',
  other_requirements TEXT DEFAULT NULL COMMENT '其他要求',
  brief_content TEXT DEFAULT NULL COMMENT '完整Brief内容',
  rich_content JSON DEFAULT NULL COMMENT 'Brief各内容区域的富文本显示格式',
  version_no INT NOT NULL DEFAULT 1 COMMENT '当前版本号',
  status VARCHAR(32) NOT NULL DEFAULT 'draft' COMMENT '状态：draft/confirmed',
  is_shared TINYINT NOT NULL DEFAULT 0 COMMENT '是否加入租户共享Brief库',
  share_enabled TINYINT NOT NULL DEFAULT 0 COMMENT '是否开启外部分享',
  share_token VARCHAR(120) DEFAULT NULL COMMENT '外部分享token',
  share_permission VARCHAR(16) NOT NULL DEFAULT 'read' COMMENT '分享权限：read/edit/manage',
  share_time DATETIME DEFAULT NULL COMMENT '最近开启分享时间',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_share_token (share_token),
  KEY idx_ai_brief_project (project_id),
  KEY idx_ai_brief_tenant_shared (tenant_id, is_shared),
  KEY idx_ai_brief_tenant_product (tenant_id, product_name),
  KEY idx_ai_brief_tenant_creator (tenant_id, create_by, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品Brief表';

DROP TABLE IF EXISTS ai_brief_share_link;
CREATE TABLE ai_brief_share_link (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT NOT NULL COMMENT 'Brief ID',
  share_token VARCHAR(120) NOT NULL COMMENT '分享token',
  permission VARCHAR(16) NOT NULL COMMENT '链接权限：read/edit/manage',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1有效/0禁用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_share_link_token (share_token),
  UNIQUE KEY uk_ai_brief_share_link_permission (brief_id, permission),
  KEY idx_ai_brief_share_link_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief分权限分享链接表';

CREATE TABLE IF NOT EXISTS ai_brief_share_pack (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  share_token VARCHAR(120) NOT NULL,
  permission VARCHAR(16) NOT NULL DEFAULT 'read',
  enabled TINYINT NOT NULL DEFAULT 1,
  create_by INT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_share_pack_token (share_token),
  KEY idx_ai_brief_share_pack_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief批量分享包';

CREATE TABLE IF NOT EXISTS ai_brief_share_pack_item (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  share_pack_id INT NOT NULL,
  brief_id INT NOT NULL,
  create_by INT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_share_pack_item (share_pack_id, brief_id),
  KEY idx_ai_brief_share_pack_item_brief (brief_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief批量分享包明细';

DROP TABLE IF EXISTS ai_brief_version;
CREATE TABLE ai_brief_version (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT NOT NULL COMMENT 'Brief ID',
  version_no INT NOT NULL COMMENT '版本号',
  version_label VARCHAR(80) DEFAULT NULL COMMENT '版本标签',
  content_snapshot JSON NOT NULL COMMENT '内容快照',
  score_snapshot JSON DEFAULT NULL COMMENT '评分快照',
  change_note VARCHAR(500) DEFAULT NULL COMMENT '变更说明',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_version (brief_id, version_no),
  KEY idx_ai_brief_version_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief版本表';

DROP TABLE IF EXISTS ai_brief_collaborator;
CREATE TABLE ai_brief_collaborator (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT NOT NULL COMMENT 'Brief ID',
  user_id INT NOT NULL COMMENT '协作者用户ID',
  permission VARCHAR(32) NOT NULL DEFAULT 'read' COMMENT '权限：read/edit/manage',
  permission_source VARCHAR(16) NOT NULL DEFAULT 'link' COMMENT '权限来源：link/approval',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1有效/0禁用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_collaborator_user (brief_id, user_id),
  KEY idx_ai_brief_collaborator_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief协作者表';
DROP TABLE IF EXISTS ai_project_brief_ref;
CREATE TABLE ai_project_brief_ref (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '接收方项目ID',
  brief_id INT NOT NULL COMMENT '共享Brief ID',
  create_by INT DEFAULT NULL COMMENT '关联人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_project_brief_ref (project_id, brief_id),
  KEY idx_ai_project_brief_ref_brief (brief_id),
  KEY idx_ai_project_brief_ref_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目共享Brief引用表';

DROP TABLE IF EXISTS ai_brief_edit_request;
CREATE TABLE ai_brief_edit_request (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT NOT NULL COMMENT 'Brief ID',
  requester_id INT NOT NULL COMMENT '申请人用户ID',
  owner_id INT NOT NULL COMMENT 'Brief拥有者用户ID',
  request_message VARCHAR(500) DEFAULT NULL COMMENT '申请说明',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/approved/rejected',
  approve_time DATETIME DEFAULT NULL COMMENT '审批时间',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_brief_edit_request_brief (brief_id),
  KEY idx_ai_brief_edit_request_owner (owner_id, status),
  KEY idx_ai_brief_edit_request_requester (requester_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief编辑权限申请表';

DROP TABLE IF EXISTS ai_selling_point;
CREATE TABLE ai_selling_point (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT NOT NULL COMMENT 'Brief ID',
  point_content TEXT NOT NULL COMMENT '卖点内容',
  point_type VARCHAR(32) NOT NULL DEFAULT 'auxiliary' COMMENT '类型：primary/auxiliary/candidate',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_selling_point_brief (brief_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief卖点明细表';

DROP TABLE IF EXISTS ai_brief_ai_result;
CREATE TABLE ai_brief_ai_result (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT DEFAULT NULL COMMENT 'Brief ID',
  result_type VARCHAR(60) NOT NULL COMMENT '类型：optimize/score/compare',
  provider_id INT DEFAULT NULL COMMENT 'Provider ID',
  prompt_template_id INT DEFAULT NULL COMMENT 'Prompt模板ID',
  result_json JSON NOT NULL COMMENT '结构化结果',
  raw_response JSON DEFAULT NULL COMMENT '模型原始返回',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_brief_ai_result_brief (brief_id),
  KEY idx_ai_brief_ai_result_tenant_type (tenant_id, result_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief AI优化评分结果表';

DROP TABLE IF EXISTS ai_selling_point_asset;
CREATE TABLE ai_selling_point_asset (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  asset_name VARCHAR(180) NOT NULL COMMENT '资产名称',
  source_type VARCHAR(60) NOT NULL DEFAULT 'manual' COMMENT '来源：manual/import/project',
  tag_text VARCHAR(255) DEFAULT NULL COMMENT '标签文本',
  main_point TEXT DEFAULT NULL COMMENT '主卖点',
  target_audience TEXT DEFAULT NULL COMMENT '目标人群',
  usage_count INT NOT NULL DEFAULT 0 COMMENT '使用次数',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_selling_asset_tenant (tenant_id, update_time),
  KEY idx_ai_selling_asset_creator (tenant_id, create_by, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='我的卖点资产库表';

DROP TABLE IF EXISTS ai_selling_point_asset_item;
CREATE TABLE ai_selling_point_asset_item (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  asset_id INT NOT NULL COMMENT '资产ID',
  point_content TEXT NOT NULL COMMENT '卖点内容',
  point_type VARCHAR(32) NOT NULL DEFAULT 'auxiliary' COMMENT '卖点类型',
  metadata_json JSON DEFAULT NULL COMMENT '扩展信息',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_selling_asset_item_asset (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='卖点资产明细表';

DROP TABLE IF EXISTS ai_viral_asset;
CREATE TABLE ai_viral_asset (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  asset_name VARCHAR(180) NOT NULL COMMENT '资产名称',
  asset_kind VARCHAR(60) NOT NULL COMMENT '类型：script/structure_formula/shot_report/link_analysis',
  source_type VARCHAR(60) NOT NULL DEFAULT 'upload' COMMENT '来源',
  platform VARCHAR(60) DEFAULT NULL COMMENT '平台',
  source_url VARCHAR(1000) DEFAULT NULL COMMENT '来源链接',
  script_text LONGTEXT DEFAULT NULL COMMENT '脚本文案',
  structure_formula TEXT DEFAULT NULL COMMENT '结构公式',
  shot_report JSON DEFAULT NULL COMMENT '拉片报告',
  tags_json JSON DEFAULT NULL COMMENT '标签',
  storage_key VARCHAR(500) DEFAULT NULL COMMENT '对象存储key',
  usage_count INT NOT NULL DEFAULT 0 COMMENT '使用次数',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_viral_asset_tenant (tenant_id, update_time),
  KEY idx_ai_viral_asset_kind (asset_kind),
  KEY idx_ai_viral_asset_creator (tenant_id, create_by, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='爆款脚本资产库表';

-- =========================
-- 5. 爆款解析、结构公式、模板
-- =========================

DROP TABLE IF EXISTS ai_source_analysis;
CREATE TABLE ai_source_analysis (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  mode VARCHAR(32) NOT NULL DEFAULT 'viral' COMMENT '模式：viral/original/template/mine',
  source_url VARCHAR(1000) DEFAULT NULL COMMENT '来源链接',
  platform VARCHAR(60) DEFAULT NULL COMMENT '平台',
  title VARCHAR(240) DEFAULT NULL COMMENT '标题',
  author_name VARCHAR(160) DEFAULT NULL COMMENT '作者',
  cover_url VARCHAR(500) DEFAULT NULL COMMENT '封面',
  video_url VARCHAR(1000) DEFAULT NULL COMMENT '视频地址',
  metrics_json JSON DEFAULT NULL COMMENT '互动数据',
  editable_copy LONGTEXT DEFAULT NULL COMMENT '可编辑完整文案',
  structure_summary TEXT DEFAULT NULL COMMENT '结构总结',
  status VARCHAR(32) NOT NULL DEFAULT 'draft' COMMENT '状态',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_source_analysis_project (project_id),
  KEY idx_ai_source_analysis_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容来源分析表';

DROP TABLE IF EXISTS ai_source_report;
CREATE TABLE ai_source_report (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  analysis_id INT NOT NULL COMMENT '来源分析ID',
  report_type VARCHAR(60) NOT NULL COMMENT '报告类型：copy/structure_formula/shot_report/asr',
  report_content JSON NOT NULL COMMENT '报告内容',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_source_report_analysis (analysis_id),
  KEY idx_ai_source_report_type (report_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='来源分析报告明细表';

DROP TABLE IF EXISTS ai_structure_formula;
CREATE TABLE ai_structure_formula (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID，NULL表示公共',
  formula_name VARCHAR(180) NOT NULL COMMENT '公式名称',
  platform VARCHAR(60) DEFAULT NULL COMMENT '平台',
  video_type VARCHAR(80) DEFAULT NULL COMMENT '视频类型',
  formula_text TEXT NOT NULL COMMENT '结构公式',
  scenario_text TEXT DEFAULT NULL COMMENT '适用场景',
  tags_json JSON DEFAULT NULL COMMENT '标签',
  source_analysis_id INT DEFAULT NULL COMMENT '来源分析ID',
  usage_count INT NOT NULL DEFAULT 0 COMMENT '使用次数',
  risk_level VARCHAR(32) NOT NULL DEFAULT 'low' COMMENT '风险等级',
  is_public TINYINT NOT NULL DEFAULT 0 COMMENT '是否公共',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_structure_tenant_platform (tenant_id, platform, video_type),
  KEY idx_ai_structure_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结构公式库表';

DROP TABLE IF EXISTS ai_script_template;
CREATE TABLE ai_script_template (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID，NULL表示平台模板',
  template_name VARCHAR(160) NOT NULL COMMENT '模板名称',
  category VARCHAR(80) DEFAULT NULL COMMENT '分类',
  template_source VARCHAR(120) DEFAULT '平台模板' COMMENT '模板来源',
  actor VARCHAR(80) DEFAULT NULL COMMENT '演员',
  people VARCHAR(80) DEFAULT NULL COMMENT '人数',
  popularity VARCHAR(40) DEFAULT NULL COMMENT '人气',
  difficulty VARCHAR(40) DEFAULT NULL COMMENT '难度',
  paragraph_structure TEXT DEFAULT NULL COMMENT '段落结构拆解',
  emotion_turning_points TEXT DEFAULT NULL COMMENT '情绪转折点',
  first_five_seconds_hook TEXT DEFAULT NULL COMMENT '前5秒钩子话术提炼',
  structure_formula TEXT DEFAULT NULL COMMENT '结构模型公式',
  script_template_library TEXT DEFAULT NULL COMMENT '脚本模版库提示词',
  reference_url VARCHAR(500) DEFAULT NULL COMMENT 'URL链接',
  reference_desc TEXT DEFAULT NULL COMMENT 'URL内容描述',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '展示排序序号，越小越靠前',
  locked TINYINT NOT NULL DEFAULT 0 COMMENT '是否锁定',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '兼容状态：0下架 1上架',
  audit_status VARCHAR(20) NOT NULL DEFAULT 'approved' COMMENT '审核状态：draft草稿/running运行中/approved审核通过/rejected审核失败',
  publish_status VARCHAR(16) NOT NULL DEFAULT 'online' COMMENT '上架状态：online上架/offline下架',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_script_template_category (category, audit_status, publish_status),
  KEY idx_ai_script_template_sort (status, sort_order, update_time),
  KEY idx_ai_script_template_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本模板表';

-- =========================
-- 6. 脚本、分镜、合规、审核
-- =========================

DROP TABLE IF EXISTS ai_storyboard_script;
CREATE TABLE ai_storyboard_script (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  brief_id INT DEFAULT NULL COMMENT '生成脚本时使用的Brief ID',
  brief_snapshot LONGTEXT DEFAULT NULL COMMENT '生成脚本时固化的Brief内容快照',
  script_name VARCHAR(220) NOT NULL COMMENT '脚本名称',
  script_type VARCHAR(40) NOT NULL DEFAULT 'viral' COMMENT '类型：viral/template/original',
  generation_duration VARCHAR(40) DEFAULT NULL COMMENT '生成时选择的脚本时长',
  generation_format VARCHAR(80) DEFAULT NULL COMMENT '生成时选择的脚本格式编码',
  generation_format_name VARCHAR(120) DEFAULT NULL COMMENT '生成时脚本格式名称快照',
  status VARCHAR(32) NOT NULL DEFAULT 'draft' COMMENT '状态：draft/pending_review/changes_requested/revised_pending_review/approved',
  audit_status VARCHAR(32) NOT NULL DEFAULT 'not_submitted' COMMENT '审核状态',
  current_version_id INT DEFAULT NULL COMMENT '当前版本ID',
  share_token VARCHAR(120) DEFAULT NULL COMMENT '分享token',
  content_text LONGTEXT DEFAULT NULL COMMENT '脚本文本冗余',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_storyboard_script_share (share_token),
  KEY idx_ai_storyboard_script_project (project_id),
  KEY idx_ai_storyboard_script_brief (brief_id),
  KEY idx_ai_storyboard_script_tenant_status (tenant_id, status),
  KEY idx_ai_storyboard_script_creator (tenant_id, create_by, update_time),
  KEY idx_ai_storyboard_script_project_creator_updated (tenant_id, create_by, project_id, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分镜脚本主表';

DROP TABLE IF EXISTS ai_script_version;
CREATE TABLE ai_script_version (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  script_id INT NOT NULL COMMENT '脚本ID',
  version_no INT NOT NULL COMMENT '版本号',
  version_title VARCHAR(220) NOT NULL COMMENT '版本标题',
  content_snapshot JSON NOT NULL COMMENT '内容快照',
  change_note VARCHAR(500) DEFAULT NULL COMMENT '变更说明',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_script_version (script_id, version_no),
  KEY idx_ai_script_version_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本版本表';

DROP TABLE IF EXISTS ai_script_polish_message;
CREATE TABLE ai_script_polish_message (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  script_id INT NOT NULL COMMENT '脚本ID',
  user_id INT NOT NULL COMMENT '发起润色的用户ID',
  reply_to_id INT DEFAULT NULL COMMENT '回复的用户消息ID',
  role VARCHAR(20) NOT NULL COMMENT '消息角色：user/assistant',
  status VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT '状态：pending/success/failed',
  content LONGTEXT NOT NULL COMMENT '消息正文',
  context_snapshot JSON DEFAULT NULL COMMENT '本次润色完整上下文快照',
  error_message TEXT DEFAULT NULL COMMENT '失败原因',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_script_polish_message_script (tenant_id, script_id, id),
  KEY idx_ai_script_polish_message_user (tenant_id, user_id, create_time),
  KEY idx_ai_script_polish_message_reply (reply_to_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本AI润色聊天消息';

DROP TABLE IF EXISTS ai_storyboard_shot;
CREATE TABLE ai_storyboard_shot (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  script_version_id INT NOT NULL COMMENT '脚本版本ID',
  shot_no INT NOT NULL COMMENT '镜号',
  shot_type VARCHAR(60) DEFAULT NULL COMMENT '景别',
  scene_description TEXT DEFAULT NULL COMMENT '画面描述',
  line_text TEXT DEFAULT NULL COMMENT '台词/旁白',
  duration_seconds DECIMAL(8,2) DEFAULT NULL COMMENT '时长秒',
  selling_point_note TEXT DEFAULT NULL COMMENT '卖点植入说明',
  risk_level VARCHAR(32) NOT NULL DEFAULT 'low' COMMENT '风险等级',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_storyboard_shot_version (script_version_id, sort_order),
  KEY idx_ai_storyboard_shot_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分镜镜头表';

DROP TABLE IF EXISTS ai_compliance_word;
CREATE TABLE ai_compliance_word (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID，NULL表示公共',
  word_text VARCHAR(120) NOT NULL COMMENT '词',
  category VARCHAR(80) NOT NULL COMMENT '分类',
  risk_level VARCHAR(32) NOT NULL DEFAULT 'medium' COMMENT '风险等级',
  suggestion TEXT DEFAULT NULL COMMENT '替换建议',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_compliance_word_tenant (tenant_id, category, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合规词库表';

DROP TABLE IF EXISTS ai_compliance_check;
CREATE TABLE ai_compliance_check (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  script_version_id INT NOT NULL COMMENT '脚本版本ID',
  status VARCHAR(32) NOT NULL DEFAULT 'completed' COMMENT '检测状态',
  risk_count INT NOT NULL DEFAULT 0 COMMENT '风险数量',
  result_json JSON NOT NULL COMMENT '检测结果',
  check_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '检测时间',
  PRIMARY KEY (id),
  KEY idx_ai_compliance_check_version (script_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合规检测结果表';

DROP TABLE IF EXISTS ai_originality_check;
CREATE TABLE ai_originality_check (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  script_version_id INT NOT NULL COMMENT '脚本版本ID',
  similarity_percent DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT '相似度百分比',
  matched_sources JSON DEFAULT NULL COMMENT '匹配来源',
  suggestion TEXT DEFAULT NULL COMMENT '建议',
  check_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '检测时间',
  PRIMARY KEY (id),
  KEY idx_ai_originality_check_version (script_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='原创度检测表';

DROP TABLE IF EXISTS ai_audit_task;
CREATE TABLE ai_audit_task (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT DEFAULT NULL COMMENT '项目ID',
  script_id INT NOT NULL COMMENT '脚本ID',
  current_version_id INT DEFAULT NULL COMMENT '脚本版本ID',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/approved/rejected',
  stage VARCHAR(60) NOT NULL DEFAULT 'operation_review' COMMENT '审核阶段',
  assignee_id INT DEFAULT NULL COMMENT '审核人',
  submitter_id INT DEFAULT NULL COMMENT '提交人',
  risk_summary TEXT DEFAULT NULL COMMENT '风险摘要',
  due_time DATETIME DEFAULT NULL COMMENT '截止时间',
  submit_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  complete_time DATETIME DEFAULT NULL COMMENT '完成时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_audit_task_tenant_status (tenant_id, status, submit_time),
  KEY idx_ai_audit_task_assignee (assignee_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核任务表';

DROP TABLE IF EXISTS ai_audit_record;
CREATE TABLE ai_audit_record (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  audit_task_id INT NOT NULL COMMENT '审核任务ID',
  auditor_id INT DEFAULT NULL COMMENT '审核人',
  action_code VARCHAR(40) NOT NULL COMMENT '动作：submit/approve/reject/assign',
  comment_text TEXT DEFAULT NULL COMMENT '审核意见',
  from_status VARCHAR(32) DEFAULT NULL COMMENT '原状态',
  to_status VARCHAR(32) DEFAULT NULL COMMENT '新状态',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_audit_record_task (audit_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核记录表';

DROP TABLE IF EXISTS ai_audit_rule;
CREATE TABLE ai_audit_rule (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID',
  rule_name VARCHAR(160) NOT NULL COMMENT '规则名称',
  rule_type VARCHAR(60) NOT NULL COMMENT '规则类型',
  config_json JSON NOT NULL COMMENT '规则配置',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_audit_rule_tenant_type (tenant_id, rule_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核规则表';

-- =========================
-- 7. 素材、视觉配置、生成任务、导出
-- =========================

DROP TABLE IF EXISTS ai_asset;
CREATE TABLE ai_asset (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT DEFAULT NULL COMMENT '项目ID',
  owner_id INT DEFAULT NULL COMMENT '归属用户',
  asset_name VARCHAR(220) NOT NULL COMMENT '素材名称',
  asset_type VARCHAR(60) NOT NULL COMMENT '类型：image/video/audio/file/export',
  category VARCHAR(80) DEFAULT NULL COMMENT '分类',
  storage_key VARCHAR(500) DEFAULT NULL COMMENT '对象存储key',
  preview_url VARCHAR(500) DEFAULT NULL COMMENT '预览地址',
  mime_type VARCHAR(120) DEFAULT NULL COMMENT 'MIME',
  file_size_bytes BIGINT DEFAULT NULL COMMENT '文件大小',
  duration_seconds DECIMAL(10,2) DEFAULT NULL COMMENT '时长',
  width INT DEFAULT NULL COMMENT '宽',
  height INT DEFAULT NULL COMMENT '高',
  source VARCHAR(60) DEFAULT 'upload' COMMENT '来源：upload/generated/export',
  usage_count INT NOT NULL DEFAULT 0 COMMENT '使用次数',
  metadata_json JSON DEFAULT NULL COMMENT '扩展信息',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_asset_tenant_type (tenant_id, asset_type, create_time),
  KEY idx_ai_asset_project (project_id),
  KEY idx_ai_asset_owner (tenant_id, owner_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='素材表';

DROP TABLE IF EXISTS ai_asset_tag;
CREATE TABLE ai_asset_tag (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID，NULL表示公共',
  tag_name VARCHAR(80) NOT NULL COMMENT '标签名称',
  category VARCHAR(60) DEFAULT NULL COMMENT '分类',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_asset_tag_tenant (tenant_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='素材标签表';

DROP TABLE IF EXISTS ai_asset_tag_rel;
CREATE TABLE ai_asset_tag_rel (
  asset_id INT NOT NULL COMMENT '素材ID',
  tag_id INT NOT NULL COMMENT '标签ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (asset_id, tag_id),
  KEY idx_ai_asset_tag_rel_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='素材标签关联表';

DROP TABLE IF EXISTS ai_visual_binding;
CREATE TABLE ai_visual_binding (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  shot_id INT DEFAULT NULL COMMENT '镜头ID',
  asset_id INT DEFAULT NULL COMMENT '素材ID',
  binding_type VARCHAR(60) NOT NULL COMMENT '绑定类型：scene/role/prop/style_ref',
  config_json JSON DEFAULT NULL COMMENT '绑定配置',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_visual_binding_project (project_id),
  KEY idx_ai_visual_binding_shot (shot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='视觉元素绑定表';

DROP TABLE IF EXISTS ai_generation_task;
CREATE TABLE ai_generation_task (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT DEFAULT NULL COMMENT '项目ID',
  create_by INT DEFAULT NULL COMMENT '创建人',
  update_by INT DEFAULT NULL COMMENT '更新人',
  task_type VARCHAR(60) NOT NULL COMMENT '任务类型：parse_video/generate_script/generate_video/tts/export',
  provider_code VARCHAR(80) DEFAULT NULL COMMENT '供应商编码',
  task_label VARCHAR(240) DEFAULT NULL COMMENT '任务标题',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/running/success/failed/canceled',
  progress INT NOT NULL DEFAULT 0 COMMENT '进度',
  input_payload JSON DEFAULT NULL COMMENT '输入参数',
  result_payload JSON DEFAULT NULL COMMENT '结果',
  error_code VARCHAR(80) DEFAULT NULL COMMENT '错误码',
  error_message TEXT DEFAULT NULL COMMENT '错误信息',
  idempotency_key VARCHAR(160) DEFAULT NULL COMMENT '幂等key',
  quota_request_no VARCHAR(100) DEFAULT NULL COMMENT '并发任务额度预占请求号',
  start_time DATETIME DEFAULT NULL COMMENT '开始时间',
  finish_time DATETIME DEFAULT NULL COMMENT '完成时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_generation_task_idem (tenant_id, idempotency_key),
  KEY idx_ai_generation_task_project (project_id, create_time),
  KEY idx_ai_generation_task_status (status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI异步任务表';

DROP TABLE IF EXISTS ai_video_segment;
CREATE TABLE ai_video_segment (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  shot_id INT DEFAULT NULL COMMENT '镜头ID',
  task_id INT DEFAULT NULL COMMENT '任务ID',
  asset_id INT DEFAULT NULL COMMENT '视频素材ID',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态',
  tags_json JSON DEFAULT NULL COMMENT '标签',
  duration_seconds DECIMAL(10,2) DEFAULT NULL COMMENT '时长',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_video_segment_project (project_id),
  KEY idx_ai_video_segment_shot (shot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分镜视频片段表';

DROP TABLE IF EXISTS ai_dubbing_asset;
CREATE TABLE ai_dubbing_asset (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  task_id INT DEFAULT NULL COMMENT '任务ID',
  asset_id INT DEFAULT NULL COMMENT '音频/视频素材ID',
  mode VARCHAR(40) NOT NULL COMMENT '模式：tts/lip_sync',
  voice VARCHAR(80) DEFAULT NULL COMMENT '音色',
  speed VARCHAR(40) DEFAULT NULL COMMENT '语速',
  tone VARCHAR(40) DEFAULT NULL COMMENT '语调',
  volume VARCHAR(20) DEFAULT NULL COMMENT '音量',
  lip_precision VARCHAR(60) DEFAULT NULL COMMENT '对口型精度',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_dubbing_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配音/对口型产物表';

DROP TABLE IF EXISTS ai_timeline_config;
CREATE TABLE ai_timeline_config (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  selected_clip VARCHAR(80) DEFAULT NULL COMMENT '选中片段',
  transition_effect VARCHAR(80) DEFAULT NULL COMMENT '转场',
  background_music_asset_id INT DEFAULT NULL COMMENT '背景音乐素材ID',
  resolution VARCHAR(20) DEFAULT '1080P' COMMENT '分辨率',
  config_json JSON DEFAULT NULL COMMENT '时间轴配置',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_timeline_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成片时间轴配置表';

DROP TABLE IF EXISTS ai_export_job;
CREATE TABLE ai_export_job (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT DEFAULT NULL COMMENT '项目ID',
  task_id INT DEFAULT NULL COMMENT '任务ID',
  export_type VARCHAR(60) NOT NULL COMMENT '导出类型：script/video/report',
  resolution VARCHAR(20) DEFAULT NULL COMMENT '分辨率',
  file_name VARCHAR(240) DEFAULT NULL COMMENT '文件名',
  asset_id INT DEFAULT NULL COMMENT '导出产物素材ID',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_export_job_project (project_id),
  KEY idx_ai_export_job_tenant (tenant_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='导出任务表';

-- =========================
-- 8. 会员、钱包、支付、额度
-- =========================

DROP TABLE IF EXISTS ai_membership_plan;
CREATE TABLE ai_membership_plan (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  plan_code VARCHAR(80) NOT NULL COMMENT '套餐编码',
  plan_name VARCHAR(120) NOT NULL COMMENT '套餐名称',
  plan_level INT NOT NULL DEFAULT 0 COMMENT '会员等级排序',
  is_free TINYINT NOT NULL DEFAULT 0 COMMENT '是否免费套餐',
  period_days INT NOT NULL COMMENT '有效天数',
  price DECIMAL(14,2) NOT NULL COMMENT '价格',
  benefits_json JSON DEFAULT NULL COMMENT '权益配置',
  description VARCHAR(500) DEFAULT NULL COMMENT '套餐说明',
  display_order INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_membership_plan_code (plan_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员套餐表';

DROP TABLE IF EXISTS ai_user_membership;
CREATE TABLE ai_user_membership (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID',
  user_id INT NOT NULL COMMENT '用户ID',
  plan_id INT NOT NULL COMMENT '套餐ID',
  status VARCHAR(32) NOT NULL DEFAULT 'active' COMMENT '状态',
  source_order_no VARCHAR(80) DEFAULT NULL COMMENT '来源支付订单号',
  source_pay_method VARCHAR(40) DEFAULT NULL COMMENT '来源支付方式',
  plan_snapshot_json JSON DEFAULT NULL COMMENT '套餐快照',
  start_time DATETIME NOT NULL COMMENT '开始时间',
  expire_time DATETIME NOT NULL COMMENT '到期时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_user_membership_user (user_id, status, expire_time),
  UNIQUE KEY uk_ai_user_membership_source_order (source_order_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户会员表';

DROP TABLE IF EXISTS ai_payment_order;
CREATE TABLE ai_payment_order (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID',
  user_id INT NOT NULL COMMENT '用户ID',
  order_no VARCHAR(80) NOT NULL COMMENT '订单号',
  idempotency_key VARCHAR(100) DEFAULT NULL COMMENT '下单幂等键',
  order_type VARCHAR(40) NOT NULL COMMENT '订单类型：recharge/member',
  order_scene VARCHAR(30) DEFAULT NULL COMMENT '订单场景',
  pay_method VARCHAR(40) NOT NULL COMMENT '支付方式：wechat/alipay',
  provider VARCHAR(40) DEFAULT NULL COMMENT '支付渠道',
  trade_type VARCHAR(40) DEFAULT NULL COMMENT '交易类型',
  plan_id INT DEFAULT NULL COMMENT '会员套餐ID',
  sku_id BIGINT DEFAULT NULL COMMENT '会员SKU ID',
  subscription_id BIGINT DEFAULT NULL COMMENT '订阅ID',
  product_snapshot_json JSON DEFAULT NULL COMMENT '商品快照',
  currency VARCHAR(12) NOT NULL DEFAULT 'CNY' COMMENT '币种',
  amount DECIMAL(14,2) NOT NULL COMMENT '金额',
  paid_amount DECIMAL(14,2) DEFAULT NULL COMMENT '实付金额',
  refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '累计退款金额',
  subject VARCHAR(240) DEFAULT NULL COMMENT '订单标题',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/paid/closed/refunded',
  provider_status VARCHAR(64) DEFAULT NULL COMMENT '三方状态',
  provider_trade_no VARCHAR(120) DEFAULT NULL COMMENT '三方交易号',
  qr_content VARCHAR(1000) DEFAULT NULL COMMENT '二维码内容',
  pay_time DATETIME DEFAULT NULL COMMENT '支付时间',
  expire_time DATETIME DEFAULT NULL COMMENT '过期时间',
  notify_time DATETIME DEFAULT NULL COMMENT '通知时间',
  last_query_time DATETIME DEFAULT NULL COMMENT '最后查询时间',
  fulfill_status VARCHAR(32) DEFAULT NULL COMMENT '履约状态',
  fulfill_time DATETIME DEFAULT NULL COMMENT '履约时间',
  fulfill_error VARCHAR(1000) DEFAULT NULL COMMENT '履约错误',
  close_time DATETIME DEFAULT NULL COMMENT '关闭时间',
  version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_payment_order_no (order_no),
  UNIQUE KEY uk_ai_payment_order_idempotency (user_id, idempotency_key),
  UNIQUE KEY uk_ai_payment_order_provider_trade (provider, provider_trade_no),
  KEY idx_ai_payment_order_user (user_id, create_time),
  KEY idx_ai_payment_order_subscription (subscription_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付订单表';

DROP TABLE IF EXISTS ai_payment_callback;
CREATE TABLE ai_payment_callback (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  provider VARCHAR(40) NOT NULL COMMENT '支付供应商',
  order_no VARCHAR(80) DEFAULT NULL COMMENT '订单号',
  notify_id VARCHAR(120) DEFAULT NULL COMMENT '通知ID',
  provider_trade_no VARCHAR(120) DEFAULT NULL COMMENT '三方交易号',
  trade_status VARCHAR(64) DEFAULT NULL COMMENT '交易状态',
  total_amount DECIMAL(14,2) DEFAULT NULL COMMENT '通知金额',
  headers_json JSON DEFAULT NULL COMMENT '请求头',
  raw_body MEDIUMTEXT DEFAULT NULL COMMENT '原始请求体',
  signature VARCHAR(1000) DEFAULT NULL COMMENT '签名',
  verified TINYINT DEFAULT 0 COMMENT '是否验签通过',
  error_msg VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
  received_time DATETIME DEFAULT NULL COMMENT '接收时间',
  payload_json JSON NOT NULL COMMENT '回调内容',
  handle_result VARCHAR(40) NOT NULL DEFAULT 'pending' COMMENT '处理结果',
  handle_time DATETIME DEFAULT NULL COMMENT '处理时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_payment_callback_order (order_no),
  UNIQUE KEY uk_ai_payment_callback_notify (provider, notify_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付回调日志表';

DROP TABLE IF EXISTS ai_user_pay_contract;
CREATE TABLE ai_user_pay_contract (
  id BIGINT NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT DEFAULT NULL,
  user_id BIGINT NOT NULL,
  subscription_id BIGINT DEFAULT NULL,
  initial_order_no VARCHAR(80) DEFAULT NULL COMMENT '签约后发起首期扣款的本地订单号',
  channel VARCHAR(32) NOT NULL COMMENT 'wechat_auto_deduct | alipay_auto_deduct',
  plan_id VARCHAR(128) DEFAULT NULL COMMENT '渠道签约产品或模板ID',
  contract_code VARCHAR(128) NOT NULL COMMENT '商户侧签约协议号',
  contract_id VARCHAR(128) DEFAULT NULL COMMENT '渠道侧协议ID',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending | signed | terminated | expired',
  signed_time DATETIME DEFAULT NULL,
  terminated_time DATETIME DEFAULT NULL,
  terminate_mode VARCHAR(32) DEFAULT NULL COMMENT 'user | merchant | system',
  notify_url VARCHAR(512) DEFAULT NULL,
  extra_json JSON DEFAULT NULL COMMENT '渠道额外字段',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  active_slot TINYINT GENERATED ALWAYS AS (
    CASE WHEN status IN ('pending', 'signed') AND deleted = 0 THEN 1 ELSE NULL END
  ) STORED COMMENT '待签约或生效协议唯一槽',
  PRIMARY KEY (id),
  UNIQUE KEY uk_contract_code_channel (contract_code, channel),
  UNIQUE KEY uk_user_channel_active (user_id, channel, active_slot),
  UNIQUE KEY uk_contract_initial_order (initial_order_no),
  KEY idx_subscription_id (subscription_id),
  KEY idx_user_id (user_id),
  KEY idx_contract_id (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户支付自动扣款签约协议';

DROP TABLE IF EXISTS ai_quota_account;
CREATE TABLE ai_quota_account (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT DEFAULT NULL COMMENT '租户ID',
  user_id INT NOT NULL COMMENT '用户ID',
  quota_type VARCHAR(60) NOT NULL COMMENT '额度类型：script_generate/video_export',
  remaining_count INT NOT NULL DEFAULT 0 COMMENT '剩余额度',
  expire_time DATETIME DEFAULT NULL COMMENT '过期时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_quota_user_type (user_id, quota_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户额度账户表';

DROP TABLE IF EXISTS ai_quota_transaction;
CREATE TABLE ai_quota_transaction (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  quota_account_id INT NOT NULL COMMENT '额度账户ID',
  user_id INT NOT NULL COMMENT '用户ID',
  change_count INT NOT NULL COMMENT '变动数量',
  remaining_after INT NOT NULL COMMENT '变动后剩余',
  biz_type VARCHAR(60) DEFAULT NULL COMMENT '业务类型',
  biz_id INT DEFAULT NULL COMMENT '业务ID',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_quota_transaction_user (user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='额度流水表';

CREATE TABLE IF NOT EXISTS ai_membership_plan_sku (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  plan_id BIGINT NOT NULL COMMENT '会员套餐ID',
  sku_code VARCHAR(80) NOT NULL COMMENT 'SKU编码',
  sku_name VARCHAR(120) NOT NULL COMMENT 'SKU名称',
  billing_mode VARCHAR(20) NOT NULL COMMENT '购买方式：one_time/auto_renew',
  period_unit VARCHAR(20) NOT NULL COMMENT '周期单位：month/quarter/year',
  period_count INT NOT NULL DEFAULT 1 COMMENT '周期数量',
  price DECIMAL(14,2) NOT NULL COMMENT '售价',
  original_price DECIMAL(14,2) DEFAULT NULL COMMENT '原价',
  refund_days INT NOT NULL DEFAULT 0 COMMENT '可退款天数',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  display_order INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  create_by BIGINT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by BIGINT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership_sku_code (sku_code),
  KEY idx_membership_sku_plan_status (plan_id, status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员套餐销售SKU';

CREATE TABLE IF NOT EXISTS ai_membership_benefit_definition (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  benefit_code VARCHAR(80) NOT NULL COMMENT '权益编码',
  benefit_name VARCHAR(120) NOT NULL COMMENT '权益名称',
  category VARCHAR(40) NOT NULL COMMENT '所属模块',
  value_type VARCHAR(20) NOT NULL COMMENT '值类型',
  unit VARCHAR(30) DEFAULT NULL COMMENT '单位',
  reset_type VARCHAR(30) NOT NULL DEFAULT 'none' COMMENT '重置方式',
  preview_only TINYINT NOT NULL DEFAULT 0 COMMENT '是否仅预告',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用校验',
  description VARCHAR(500) DEFAULT NULL COMMENT '说明',
  display_order INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership_benefit_code (benefit_code),
  KEY idx_membership_benefit_category (category, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员权益定义';

CREATE TABLE IF NOT EXISTS ai_membership_plan_benefit (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  plan_id BIGINT NOT NULL COMMENT '套餐ID',
  benefit_id BIGINT NOT NULL COMMENT '权益定义ID',
  benefit_value VARCHAR(500) NOT NULL COMMENT '权益值',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
  effective_time DATETIME DEFAULT NULL COMMENT '生效时间',
  expire_time DATETIME DEFAULT NULL COMMENT '失效时间',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership_plan_benefit (plan_id, benefit_id),
  KEY idx_membership_plan_benefit_active (plan_id, enabled, effective_time, expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='套餐权益配置';

CREATE TABLE IF NOT EXISTS ai_user_subscription (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  plan_id BIGINT NOT NULL COMMENT '当前套餐ID',
  sku_id BIGINT DEFAULT NULL COMMENT '当前SKU，免费订阅可为空',
  status VARCHAR(30) NOT NULL DEFAULT 'active' COMMENT '订阅状态',
  auto_renew TINYINT NOT NULL DEFAULT 0 COMMENT '是否自动续费',
  start_time DATETIME NOT NULL COMMENT '开通时间',
  current_period_start DATETIME NOT NULL COMMENT '当前付费周期开始',
  current_period_end DATETIME NOT NULL COMMENT '当前付费周期结束',
  benefit_anchor_time DATETIME NOT NULL COMMENT '月度权益重置锚点',
  next_renew_time DATETIME DEFAULT NULL COMMENT '下次续费时间',
  grace_end_time DATETIME DEFAULT NULL COMMENT '自动续费失败后的宽限期结束时间',
  cancel_at_period_end TINYINT NOT NULL DEFAULT 0 COMMENT '是否到期取消',
  cancel_time DATETIME DEFAULT NULL COMMENT '取消续费时间',
  pending_plan_id BIGINT DEFAULT NULL COMMENT '待生效降级套餐',
  pending_sku_id BIGINT DEFAULT NULL COMMENT '待生效降级SKU',
  pending_effective_time DATETIME DEFAULT NULL COMMENT '降级生效时间',
  provider VARCHAR(30) DEFAULT NULL COMMENT '支付渠道',
  agreement_no VARCHAR(120) DEFAULT NULL COMMENT '自动扣款协议号',
  plan_snapshot_json JSON DEFAULT NULL COMMENT '套餐与权益快照',
  source_order_no VARCHAR(80) DEFAULT NULL COMMENT '来源订单号',
  version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  active_slot TINYINT GENERATED ALWAYS AS (
    CASE WHEN status IN ('active', 'canceling', 'past_due') THEN 1 ELSE NULL END
  ) STORED COMMENT '有效订阅唯一槽',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_subscription_active (user_id, active_slot),
  UNIQUE KEY uk_user_subscription_source_order (source_order_no),
  KEY idx_user_subscription_period (user_id, status, current_period_end),
  KEY idx_user_subscription_renew (status, auto_renew, next_renew_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户会员订阅';

CREATE TABLE IF NOT EXISTS ai_membership_benefit_cycle (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  subscription_id BIGINT NOT NULL COMMENT '订阅ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  plan_id BIGINT NOT NULL COMMENT '当期套餐ID',
  cycle_no INT NOT NULL COMMENT '权益周期序号',
  cycle_start DATETIME NOT NULL COMMENT '周期开始',
  cycle_end DATETIME NOT NULL COMMENT '周期结束',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active/closed/refunded',
  benefit_snapshot_json JSON DEFAULT NULL COMMENT '当期权益快照',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership_subscription_cycle (subscription_id, cycle_start),
  KEY idx_membership_cycle_user_time (user_id, cycle_start, cycle_end),
  KEY idx_membership_cycle_expire (status, cycle_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员月度权益周期';

CREATE TABLE IF NOT EXISTS ai_user_benefit_usage (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  cycle_id BIGINT DEFAULT NULL COMMENT '月度权益周期ID，终身额度为空',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  benefit_code VARCHAR(80) NOT NULL COMMENT '权益编码',
  usage_scope VARCHAR(30) NOT NULL COMMENT 'membership_month/lifetime',
  scope_key VARCHAR(100) NOT NULL COMMENT '周期作用域唯一键',
  quota_total BIGINT NOT NULL DEFAULT 0 COMMENT '当期总额度，-1表示无限',
  used_amount BIGINT NOT NULL DEFAULT 0 COMMENT '已使用',
  reserved_amount BIGINT NOT NULL DEFAULT 0 COMMENT '任务预占',
  version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_benefit_scope (user_id, benefit_code, scope_key),
  KEY idx_benefit_usage_cycle (cycle_id, benefit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户周期权益使用量';

CREATE TABLE IF NOT EXISTS ai_benefit_usage_transaction (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  usage_id BIGINT NOT NULL COMMENT '权益使用量账户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  benefit_code VARCHAR(80) NOT NULL COMMENT '权益编码',
  request_no VARCHAR(100) NOT NULL COMMENT '幂等请求号',
  amount BIGINT NOT NULL COMMENT '占用数量',
  status VARCHAR(20) NOT NULL COMMENT 'reserved/confirmed/released',
  biz_type VARCHAR(60) DEFAULT NULL,
  biz_id BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_benefit_usage_request (request_no),
  KEY idx_benefit_usage_tx_user (user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权益额度预占流水';

CREATE TABLE IF NOT EXISTS ai_storage_object (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  tenant_id BIGINT DEFAULT NULL COMMENT 'Tenant ID',
  user_id BIGINT NOT NULL COMMENT 'User ID',
  object_key VARCHAR(500) NOT NULL COMMENT 'Storage object key',
  request_no VARCHAR(100) NOT NULL COMMENT 'Quota reservation request number',
  size_bytes BIGINT NOT NULL COMMENT 'Object size in bytes',
  biz_type VARCHAR(60) DEFAULT NULL COMMENT 'Business type',
  biz_id BIGINT DEFAULT NULL COMMENT 'Business ID',
  status VARCHAR(20) NOT NULL COMMENT 'reserved/active/released',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_storage_object_key (tenant_id, user_id, object_key),
  UNIQUE KEY uk_storage_object_request (request_no),
  KEY idx_storage_object_user_status (user_id, status, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Membership storage accounting object';
CREATE TABLE IF NOT EXISTS ai_point_package (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  package_code VARCHAR(50) NOT NULL COMMENT '积分包编码',
  package_name VARCHAR(100) NOT NULL COMMENT '积分包名称',
  price DECIMAL(14,2) NOT NULL COMMENT '销售价格',
  points BIGINT NOT NULL COMMENT '到账积分',
  description VARCHAR(500) DEFAULT NULL COMMENT '展示说明',
  display_order INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1启用，0停用',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_point_package_code (package_code),
  KEY idx_point_package_status_order (status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='可售积分包';

CREATE TABLE IF NOT EXISTS ai_template_custom_request (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  user_id INT NOT NULL COMMENT '申请用户ID',
  plan_id BIGINT NOT NULL COMMENT '申请时会员套餐ID',
  title VARCHAR(120) NOT NULL COMMENT '定制模板标题',
  requirements TEXT NOT NULL COMMENT '定制需求',
  contact VARCHAR(200) DEFAULT NULL COMMENT '联系方式',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/processing/completed/rejected',
  admin_remark VARCHAR(1000) DEFAULT NULL COMMENT '后台处理备注',
  handled_by INT DEFAULT NULL COMMENT '处理人',
  handled_time DATETIME DEFAULT NULL COMMENT '处理时间',
  create_by INT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_template_custom_user (tenant_id, user_id, create_time),
  KEY idx_template_custom_status (status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='至尊会员独家定制模板工单';

CREATE TABLE IF NOT EXISTS ai_point_account (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  available_points BIGINT NOT NULL DEFAULT 0 COMMENT '可用积分',
  frozen_points BIGINT NOT NULL DEFAULT 0 COMMENT '冻结积分',
  version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_point_account_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户积分账户';

CREATE TABLE IF NOT EXISTS ai_point_transaction (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  account_id BIGINT NOT NULL COMMENT '积分账户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  transaction_type VARCHAR(30) NOT NULL COMMENT 'purchase/reward/consume/refund',
  change_points BIGINT NOT NULL COMMENT '积分变动',
  balance_after BIGINT NOT NULL COMMENT '变动后余额',
  biz_type VARCHAR(60) DEFAULT NULL COMMENT '业务类型',
  biz_id BIGINT DEFAULT NULL COMMENT '业务ID',
  request_no VARCHAR(100) NOT NULL COMMENT '幂等请求号',
  source_order_no VARCHAR(80) DEFAULT NULL COMMENT '来源订单号',
  remark VARCHAR(500) DEFAULT NULL COMMENT '说明',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_point_transaction_request (request_no),
  KEY idx_point_transaction_user (user_id, create_time),
  KEY idx_point_transaction_biz (biz_type, biz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户积分流水';

CREATE TABLE IF NOT EXISTS ai_daily_point_reward (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  reward_date DATE NOT NULL COMMENT '奖励日期',
  plan_id BIGINT NOT NULL COMMENT '领取时套餐',
  reward_points BIGINT NOT NULL COMMENT '奖励积分',
  transaction_id BIGINT NOT NULL COMMENT '积分流水ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daily_point_reward (user_id, reward_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日登录积分奖励';

CREATE TABLE IF NOT EXISTS ai_subscription_change_record (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL,
  subscription_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  change_type VARCHAR(30) NOT NULL COMMENT 'upgrade/downgrade/renew/cancel/revoke_downgrade',
  before_plan_id BIGINT DEFAULT NULL,
  before_sku_id BIGINT DEFAULT NULL,
  after_plan_id BIGINT DEFAULT NULL,
  after_sku_id BIGINT DEFAULT NULL,
  original_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  credit_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payable_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  effective_type VARCHAR(20) NOT NULL COMMENT 'immediate/next_period',
  effective_time DATETIME DEFAULT NULL,
  source_order_no VARCHAR(80) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subscription_change_order (source_order_no),
  KEY idx_subscription_change_user (user_id, create_time),
  KEY idx_subscription_change_pending (status, effective_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员订阅变更记录';

CREATE TABLE IF NOT EXISTS ai_refund_order (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL,
  refund_no VARCHAR(80) NOT NULL COMMENT '退款单号',
  payment_order_id BIGINT NOT NULL COMMENT '原支付订单ID',
  subscription_id BIGINT DEFAULT NULL COMMENT '订阅ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  refund_amount DECIMAL(14,2) NOT NULL COMMENT '退款金额',
  refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
  provider VARCHAR(30) DEFAULT NULL,
  provider_refund_no VARCHAR(120) DEFAULT NULL,
  provider_status VARCHAR(30) DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  review_by BIGINT DEFAULT NULL,
  review_time DATETIME DEFAULT NULL,
  review_remark VARCHAR(500) DEFAULT NULL,
  requested_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_time DATETIME DEFAULT NULL,
  failure_reason VARCHAR(1000) DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_refund_order_no (refund_no),
  UNIQUE KEY uk_refund_payment_order (payment_order_id),
  KEY idx_refund_user_time (user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员退款单';

-- =========================
-- 9. 投放数据、A/B测试
-- =========================

DROP TABLE IF EXISTS ai_monitor_link;
CREATE TABLE ai_monitor_link (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  script_id INT DEFAULT NULL COMMENT '脚本ID',
  link_type VARCHAR(60) NOT NULL COMMENT '链接类型',
  variant_name VARCHAR(120) DEFAULT NULL COMMENT '版本名称',
  url VARCHAR(1000) NOT NULL COMMENT '链接',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_monitor_link_project (project_id),
  KEY idx_ai_monitor_link_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投放监测链接表';

DROP TABLE IF EXISTS ai_analytics_metric;
CREATE TABLE ai_analytics_metric (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT DEFAULT NULL COMMENT '项目ID',
  script_id INT DEFAULT NULL COMMENT '脚本ID',
  monitor_link_id INT DEFAULT NULL COMMENT '监测链接ID',
  source VARCHAR(60) NOT NULL DEFAULT 'manual' COMMENT '数据来源',
  metric_date DATE NOT NULL COMMENT '指标日期',
  plays BIGINT NOT NULL DEFAULT 0 COMMENT '播放量',
  likes BIGINT NOT NULL DEFAULT 0 COMMENT '点赞数',
  comments BIGINT NOT NULL DEFAULT 0 COMMENT '评论数',
  favorites BIGINT NOT NULL DEFAULT 0 COMMENT '收藏数',
  shares BIGINT NOT NULL DEFAULT 0 COMMENT '分享数',
  orders BIGINT NOT NULL DEFAULT 0 COMMENT '订单数',
  revenue DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '收入',
  roi DECIMAL(10,4) DEFAULT NULL COMMENT 'ROI',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_analytics_metric_day (tenant_id, project_id, script_id, metric_date),
  KEY idx_ai_analytics_metric_project_date (project_id, metric_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='投放指标日表';

DROP TABLE IF EXISTS ai_ab_test;
CREATE TABLE ai_ab_test (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  test_name VARCHAR(180) NOT NULL COMMENT '测试名称',
  status VARCHAR(32) NOT NULL DEFAULT 'draft' COMMENT '状态',
  start_time DATETIME DEFAULT NULL COMMENT '开始时间',
  end_time DATETIME DEFAULT NULL COMMENT '结束时间',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_ab_test_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='A/B测试表';

DROP TABLE IF EXISTS ai_ab_test_variant;
CREATE TABLE ai_ab_test_variant (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  ab_test_id INT NOT NULL COMMENT 'A/B测试ID',
  script_id INT DEFAULT NULL COMMENT '脚本ID',
  variant_name VARCHAR(120) NOT NULL COMMENT '版本名称',
  monitor_link_id INT DEFAULT NULL COMMENT '监测链接ID',
  plays BIGINT NOT NULL DEFAULT 0 COMMENT '播放量',
  interaction_rate DECIMAL(10,4) DEFAULT NULL COMMENT '互动率',
  conversion_rate DECIMAL(10,4) DEFAULT NULL COMMENT '转化率',
  is_winner TINYINT NOT NULL DEFAULT 0 COMMENT '是否胜出',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ai_ab_variant_test (ab_test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='A/B测试版本表';

SET FOREIGN_KEY_CHECKS = 1;
