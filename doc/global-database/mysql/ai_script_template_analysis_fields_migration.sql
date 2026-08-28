-- 脚本模板分析字段迁移（MySQL 8.0+）
-- 1) 新增四个分析字段。
ALTER TABLE ai_script_template
  ADD COLUMN IF NOT EXISTS paragraph_structure TEXT DEFAULT NULL COMMENT '段落结构拆解' AFTER difficulty,
  ADD COLUMN IF NOT EXISTS emotion_turning_points TEXT DEFAULT NULL COMMENT '情绪转折点' AFTER paragraph_structure,
  ADD COLUMN IF NOT EXISTS first_five_seconds_hook TEXT DEFAULT NULL COMMENT '钩子提炼' AFTER emotion_turning_points,
  ADD COLUMN IF NOT EXISTS structure_formula TEXT DEFAULT NULL COMMENT '结构模型公式' AFTER first_five_seconds_hook;

-- 2) 尽量保留旧数据：旧 prompt_text 迁入段落结构拆解，旧 structure_text 迁入结构模型公式。
SET @has_prompt_text = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_script_template' AND COLUMN_NAME = 'prompt_text'
);
SET @has_structure_text = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_script_template' AND COLUMN_NAME = 'structure_text'
);
SET @migrate_template_analysis_sql = IF(
  @has_prompt_text > 0 AND @has_structure_text > 0,
  'UPDATE ai_script_template SET paragraph_structure = CASE WHEN (paragraph_structure IS NULL OR paragraph_structure = '''') THEN prompt_text ELSE paragraph_structure END, structure_formula = CASE WHEN (structure_formula IS NULL OR structure_formula = '''') THEN structure_text ELSE structure_formula END WHERE (paragraph_structure IS NULL OR paragraph_structure = '''' OR structure_formula IS NULL OR structure_formula = '''') AND (prompt_text IS NOT NULL OR structure_text IS NOT NULL)',
  'SELECT 1'
);
PREPARE stmt FROM @migrate_template_analysis_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 删除旧字段。
-- 若当前 MySQL 版本不支持 DROP COLUMN IF EXISTS，请确认字段存在后手动执行不带 IF EXISTS 的两行。
-- ALTER TABLE ai_script_template DROP COLUMN IF EXISTS structure_text;
-- ALTER TABLE ai_script_template DROP COLUMN IF EXISTS prompt_text;
