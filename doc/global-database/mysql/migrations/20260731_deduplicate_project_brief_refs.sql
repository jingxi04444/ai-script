-- Project-Brief relations must be idempotent across single links and share packs.
-- Keep one relation for each tenant/project/Brief and remove historical duplicates.
DELETE duplicate_ref
FROM ai_project_brief_ref AS duplicate_ref
JOIN ai_project_brief_ref AS keeper_ref
  ON keeper_ref.tenant_id = duplicate_ref.tenant_id
 AND keeper_ref.project_id = duplicate_ref.project_id
 AND keeper_ref.brief_id = duplicate_ref.brief_id
 AND (
      keeper_ref.deleted < duplicate_ref.deleted
      OR (keeper_ref.deleted = duplicate_ref.deleted AND keeper_ref.id < duplicate_ref.id)
 );

-- Old installations may not have the unique key. Add it only when neither supported
-- unique key exists. The application uses this key for atomic insert-or-restore.
SET @has_project_brief_unique := (
    SELECT COUNT(*)
    FROM (
        SELECT index_name
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'ai_project_brief_ref'
          AND non_unique = 0
        GROUP BY index_name
        HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') IN (
            'project_id,brief_id',
            'tenant_id,project_id,brief_id'
        )
    ) AS unique_indexes
);

SET @ensure_project_brief_unique_sql := IF(
    @has_project_brief_unique = 0,
    'ALTER TABLE ai_project_brief_ref ADD UNIQUE KEY uk_ai_project_brief_ref_tenant_project_brief (tenant_id, project_id, brief_id)',
    'SELECT 1'
);
PREPARE ensure_project_brief_unique_stmt FROM @ensure_project_brief_unique_sql;
EXECUTE ensure_project_brief_unique_stmt;
DEALLOCATE PREPARE ensure_project_brief_unique_stmt;