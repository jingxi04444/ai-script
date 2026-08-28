SET NAMES utf8mb4;

ALTER TABLE ai_script_template
  ADD COLUMN IF NOT EXISTS formula_execution_checklist TEXT DEFAULT NULL COMMENT '公式执行清单Markdown表格' AFTER structure_formula,
  MODIFY COLUMN first_five_seconds_hook TEXT DEFAULT NULL COMMENT '钩子提炼';
