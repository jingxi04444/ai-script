-- 2026-07-31 22:16:01 +08:00
-- 微信开放平台登录字段与用户协议/隐私政策后台配置。
-- 执行场景：已有数据库升级；可重复执行。

USE ai_script;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_column_if_missing $$
CREATE PROCEDURE add_column_if_missing(
  IN table_name_value VARCHAR(64),
  IN column_name_value VARCHAR(64),
  IN alter_sql_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = column_name_value
  ) THEN
    SET @alter_sql = alter_sql_value;
    PREPARE statement FROM @alter_sql;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END $$

DROP PROCEDURE IF EXISTS add_index_if_missing $$
CREATE PROCEDURE add_index_if_missing(
  IN table_name_value VARCHAR(64),
  IN index_name_value VARCHAR(64),
  IN alter_sql_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND INDEX_NAME = index_name_value
  ) THEN
    SET @alter_sql = alter_sql_value;
    PREPARE statement FROM @alter_sql;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END $$

CALL add_column_if_missing(
  'sys_user',
  'wechat_open_id',
  'ALTER TABLE sys_user ADD COLUMN wechat_open_id VARCHAR(128) DEFAULT NULL COMMENT ''微信开放平台 OpenID'' AFTER email'
) $$

CALL add_column_if_missing(
  'sys_user',
  'wechat_union_id',
  'ALTER TABLE sys_user ADD COLUMN wechat_union_id VARCHAR(128) DEFAULT NULL COMMENT ''微信开放平台 UnionID'' AFTER wechat_open_id'
) $$

CALL add_index_if_missing(
  'sys_user',
  'uk_sys_user_wechat_open_id',
  'ALTER TABLE sys_user ADD UNIQUE KEY uk_sys_user_wechat_open_id (wechat_open_id)'
) $$

CALL add_index_if_missing(
  'sys_user',
  'idx_sys_user_wechat_union_id',
  'ALTER TABLE sys_user ADD KEY idx_sys_user_wechat_union_id (wechat_union_id)'
) $$

DROP PROCEDURE IF EXISTS add_column_if_missing $$
DROP PROCEDURE IF EXISTS add_index_if_missing $$

DELIMITER ;

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value,
  value_type, description, sort_order, status
) VALUES (
  NULL, 'group', 'legal', 'legal', '协议管理', NULL,
  'string', '用户协议和隐私政策发布配置', 30, 1
)
ON DUPLICATE KEY UPDATE
  config_name = VALUES(config_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

SET @legal_root_id = (SELECT id FROM sys_config_item WHERE config_key = 'legal' LIMIT 1);

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value,
  value_type, description, sort_order, status
) VALUES
  (@legal_root_id, 'item', 'legal', 'legal.user-agreement.config', '用户协议',
   '{"title":"用户协议","version":"1.0","effectiveAt":"","content":"","enabled":false}',
   'json', '用户端登录和注册展示的用户协议', 10, 1),
  (@legal_root_id, 'item', 'legal', 'legal.privacy-policy.config', '隐私政策',
   '{"title":"隐私政策","version":"1.0","effectiveAt":"","content":"","enabled":false}',
   'json', '用户端登录和注册展示的隐私政策', 20, 1)
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  config_name = VALUES(config_name),
  config_value = COALESCE(config_value, VALUES(config_value)),
  value_type = VALUES(value_type),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);
