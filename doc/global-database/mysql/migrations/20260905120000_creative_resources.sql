-- 增量迁移：不会删除既有表或数据。先备份，在选定的 ai_script 数据库中执行。
-- 此表为平台公共目录，不包含租户私有资产；种子数据单独导入。
-- 不自动写入 sys_permission：沿用 /api/admin/** 的管理员类型隔离及现有动态权限。
CREATE TABLE IF NOT EXISTS sys_creative_resource (
  id BIGINT NOT NULL COMMENT 'Snowflake 主键，由应用 ASSIGN_ID 生成',
  code VARCHAR(80) NOT NULL COMMENT '全局稳定编码；软删除后仍保留，禁止复用',
  type VARCHAR(20) NOT NULL COMMENT 'character/style/effect',
  name VARCHAR(120) NOT NULL COMMENT '资源名称',
  category VARCHAR(80) NOT NULL COMMENT '分类',
  description VARCHAR(2000) NOT NULL DEFAULT '' COMMENT '纯文本描述',
  cover_url VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '封面 HTTP(S) URL 或站内绝对路径',
  preview_video_url VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '可选预览视频',
  gallery_json JSON NOT NULL COMMENT '画廊 [{label,url}]，最多12项',
  tags_json JSON NOT NULL COMMENT '标签数组，最多20项',
  prompt TEXT NOT NULL COMMENT '提示词模板，数据而非可执行代码',
  negative_prompt TEXT NOT NULL COMMENT '负向提示词',
  config_json JSON NOT NULL COMMENT '有界 JSON 模板参数，禁止执行',
  status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/published',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '升序排列',
  license_note VARCHAR(2000) NOT NULL DEFAULT '' COMMENT '授权/使用限制说明，发布必填',
  author VARCHAR(120) NOT NULL DEFAULT '' COMMENT '作者或来源',
  create_by INT DEFAULT NULL COMMENT '创建管理员ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT DEFAULT NULL COMMENT '更新管理员ID',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除 0/1',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_creative_resource_code (code),
  KEY idx_creative_resource_catalog (deleted, status, type, sort_order, id),
  KEY idx_creative_resource_category (type, category, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台创意资源库（角色/风格/特效）';
