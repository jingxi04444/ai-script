-- 为脚本模板表补充参考链接与内容描述字段（MySQL 8.0+）
ALTER TABLE ai_script_template
  ADD COLUMN IF NOT EXISTS reference_url VARCHAR(500) DEFAULT NULL COMMENT 'URL链接' AFTER structure_formula,
  ADD COLUMN IF NOT EXISTS reference_desc TEXT DEFAULT NULL COMMENT 'URL内容描述' AFTER reference_url;
