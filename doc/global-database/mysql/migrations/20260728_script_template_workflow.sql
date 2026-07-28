-- 兼容不支持 `ADD COLUMN IF NOT EXISTS` 的 MySQL 8.0 版本。

SET @audit_status_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ai_script_template'
    AND COLUMN_NAME = 'audit_status'
);
SET @add_audit_status_sql = IF(
  @audit_status_column_exists = 0,
  'ALTER TABLE ai_script_template ADD COLUMN audit_status VARCHAR(20) NOT NULL DEFAULT ''approved'' COMMENT ''审核状态：draft草稿/running运行中/approved审核通过/rejected审核失败'' AFTER status',
  'SELECT 1'
);
PREPARE add_audit_status_stmt FROM @add_audit_status_sql;
EXECUTE add_audit_status_stmt;
DEALLOCATE PREPARE add_audit_status_stmt;

SET @publish_status_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ai_script_template'
    AND COLUMN_NAME = 'publish_status'
);
SET @add_publish_status_sql = IF(
  @publish_status_column_exists = 0,
  'ALTER TABLE ai_script_template ADD COLUMN publish_status VARCHAR(16) NOT NULL DEFAULT ''online'' COMMENT ''上架状态：online上架/offline下架'' AFTER audit_status',
  'SELECT 1'
);
PREPARE add_publish_status_stmt FROM @add_publish_status_sql;
EXECUTE add_publish_status_stmt;
DEALLOCATE PREPARE add_publish_status_stmt;

-- 只在首次增加字段时回填，重复执行不会覆盖后台已经修改过的状态。
UPDATE ai_script_template
SET audit_status = 'approved'
WHERE @audit_status_column_exists = 0;

UPDATE ai_script_template
SET publish_status = CASE WHEN status = 1 THEN 'online' ELSE 'offline' END
WHERE @publish_status_column_exists = 0;

SET @workflow_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ai_script_template'
    AND INDEX_NAME = 'idx_ai_script_template_workflow'
);
SET @add_workflow_index_sql = IF(
  @workflow_index_exists = 0,
  'CREATE INDEX idx_ai_script_template_workflow ON ai_script_template (audit_status, publish_status, sort_order)',
  'SELECT 1'
);
PREPARE add_workflow_index_stmt FROM @add_workflow_index_sql;
EXECUTE add_workflow_index_stmt;
DEALLOCATE PREPARE add_workflow_index_stmt;
