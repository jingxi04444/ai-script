-- Add Brief share permission fields for existing ai_script databases.
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

CALL add_column_if_missing(
  'ai_brief',
  'share_permission',
  'ALTER TABLE ai_brief ADD COLUMN share_permission VARCHAR(16) NOT NULL DEFAULT ''read'' COMMENT ''分享权限：read/edit/manage'' AFTER share_token'
) $$

CALL add_column_if_missing(
  'ai_brief_collaborator',
  'permission_source',
  'ALTER TABLE ai_brief_collaborator ADD COLUMN permission_source VARCHAR(16) NOT NULL DEFAULT ''link'' COMMENT ''权限来源：link/approval'' AFTER permission'
) $$

ALTER TABLE ai_brief_collaborator
  MODIFY COLUMN permission VARCHAR(32) NOT NULL DEFAULT 'read' COMMENT '权限：read/edit/manage' $$

DROP PROCEDURE IF EXISTS add_column_if_missing $$

DELIMITER ;
