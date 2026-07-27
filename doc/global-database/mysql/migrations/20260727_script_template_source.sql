ALTER TABLE ai_script_template
  ADD COLUMN template_source VARCHAR(120) DEFAULT '平台模板' COMMENT '模板来源' AFTER category;

UPDATE ai_script_template
SET template_source = '平台模板'
WHERE template_source IS NULL OR template_source = '';
