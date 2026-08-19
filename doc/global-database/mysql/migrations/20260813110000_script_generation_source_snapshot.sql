ALTER TABLE ai_storyboard_script
  ADD COLUMN generation_template_id INT DEFAULT NULL COMMENT '平台模板ID快照' AFTER generation_format_name,
  ADD COLUMN generation_template_name VARCHAR(160) DEFAULT NULL COMMENT '平台模板名称快照' AFTER generation_template_id,
  ADD COLUMN generation_original_category_id VARCHAR(80) DEFAULT NULL COMMENT 'AI原创大类编码快照' AFTER generation_template_name,
  ADD COLUMN generation_original_category_name VARCHAR(120) DEFAULT NULL COMMENT 'AI原创大类名称快照' AFTER generation_original_category_id,
  ADD COLUMN generation_original_scenario_id VARCHAR(80) DEFAULT NULL COMMENT 'AI原创子类编码快照' AFTER generation_original_category_name,
  ADD COLUMN generation_original_scenario_name VARCHAR(120) DEFAULT NULL COMMENT 'AI原创子类名称快照' AFTER generation_original_scenario_id,
  ADD KEY idx_ai_storyboard_script_template (generation_template_id);

-- 历史脚本未持久化生成来源，无法准确反推具体模板或原创分类，字段保持为空。
