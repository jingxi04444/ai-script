-- Add Brief sharing/reuse fields for existing ai_script databases.
-- Safe to run repeatedly.

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
    SELECT 1
    FROM information_schema.COLUMNS
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
    SELECT 1
    FROM information_schema.STATISTICS
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

CALL add_column_if_missing('ai_brief', 'is_shared', 'ALTER TABLE ai_brief ADD COLUMN is_shared TINYINT NOT NULL DEFAULT 0 COMMENT ''是否加入租户共享Brief库'' AFTER status') $$
CALL add_column_if_missing('ai_brief', 'share_enabled', 'ALTER TABLE ai_brief ADD COLUMN share_enabled TINYINT NOT NULL DEFAULT 0 COMMENT ''是否开启外部分享'' AFTER is_shared') $$
CALL add_column_if_missing('ai_brief', 'share_token', 'ALTER TABLE ai_brief ADD COLUMN share_token VARCHAR(120) DEFAULT NULL COMMENT ''外部分享token'' AFTER share_enabled') $$
CALL add_column_if_missing('ai_brief', 'share_time', 'ALTER TABLE ai_brief ADD COLUMN share_time DATETIME DEFAULT NULL COMMENT ''最近开启分享时间'' AFTER share_token') $$

CALL add_index_if_missing('ai_brief', 'uk_ai_brief_share_token', 'ALTER TABLE ai_brief ADD UNIQUE KEY uk_ai_brief_share_token (share_token)') $$
CALL add_index_if_missing('ai_brief', 'idx_ai_brief_tenant_shared', 'ALTER TABLE ai_brief ADD KEY idx_ai_brief_tenant_shared (tenant_id, is_shared)') $$

DROP PROCEDURE IF EXISTS add_column_if_missing $$
DROP PROCEDURE IF EXISTS add_index_if_missing $$

DELIMITER ;
