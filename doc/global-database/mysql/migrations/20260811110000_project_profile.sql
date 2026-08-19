-- 已有数据库增量升级：为项目补充创建前置资料字段。
-- 全新数据库无需执行本文件，直接执行 ai_script_mysql_schema.sql 即可。
ALTER TABLE ai_project
  ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL COMMENT '项目头像地址' AFTER project_name,
  ADD COLUMN announcement VARCHAR(1000) DEFAULT NULL COMMENT '项目公告' AFTER avatar_url;
