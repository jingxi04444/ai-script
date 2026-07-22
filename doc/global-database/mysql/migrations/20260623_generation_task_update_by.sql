-- ai_generation_task 补齐 BaseEntity 自动填充字段 update_by。
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

CALL add_column_if_missing('ai_generation_task', 'create_by', 'ALTER TABLE ai_generation_task ADD COLUMN create_by INT DEFAULT NULL COMMENT ''创建人'' AFTER project_id') $$
CALL add_column_if_missing('ai_generation_task', 'update_by', 'ALTER TABLE ai_generation_task ADD COLUMN update_by INT DEFAULT NULL COMMENT ''更新人'' AFTER create_by') $$

DROP PROCEDURE IF EXISTS add_column_if_missing $$

DELIMITER ;
