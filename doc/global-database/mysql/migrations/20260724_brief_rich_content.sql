-- Add separately stored rich-text presentation for Brief fields.
-- Plain Brief columns remain unchanged so AI prompts continue receiving clean text.
-- Safe to run repeatedly.

USE ai_script;

SET @rich_content_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ai_brief'
    AND COLUMN_NAME = 'rich_content'
);

SET @rich_content_sql = IF(
  @rich_content_exists = 0,
  'ALTER TABLE ai_brief ADD COLUMN rich_content JSON DEFAULT NULL COMMENT ''Brief各内容区域的富文本显示格式'' AFTER brief_content',
  'SELECT 1'
);

PREPARE rich_content_statement FROM @rich_content_sql;
EXECUTE rich_content_statement;
DEALLOCATE PREPARE rich_content_statement;
