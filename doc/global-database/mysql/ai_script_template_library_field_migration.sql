ALTER TABLE ai_script_template
  ADD COLUMN IF NOT EXISTS script_template_library TEXT DEFAULT NULL COMMENT '脚本模版库提示词' AFTER structure_formula;
