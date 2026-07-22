-- 导入模板支持后台上传 OSS 文件。
-- 执行场景：已有数据库升级时执行；全量新库可直接执行 ai_script_mysql_schema.sql。
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

CALL add_column_if_missing('sys_import_template_config', 'template_file_key', 'ALTER TABLE sys_import_template_config ADD COLUMN template_file_key VARCHAR(500) DEFAULT NULL COMMENT ''模板文件对象存储Key'' AFTER download_file_name') $$
CALL add_column_if_missing('sys_import_template_config', 'template_file_url', 'ALTER TABLE sys_import_template_config ADD COLUMN template_file_url VARCHAR(1000) DEFAULT NULL COMMENT ''模板文件访问URL快照'' AFTER template_file_key') $$

DROP PROCEDURE IF EXISTS add_column_if_missing $$

DELIMITER ;

UPDATE sys_import_template_config
SET
  template_name = '卖点导入模板',
  download_file_name = 'selling-point-template.xlsx',
  columns_json = JSON_ARRAY('产品名称', '产品型号', '产品价格', '产品Slogan', '目标人群', '产品特色卖点', '产品主要卖点', '产品次要卖点', '使用场景'),
  sample_rows_json = JSON_ARRAY(JSON_OBJECT(
    '产品名称', '样例产品A60MAX',
    '产品型号', 'A60MAX',
    '产品价格', '11900元',
    '产品Slogan', '万元级专业拉伸按摩椅',
    '目标人群', '久坐办公族;运动健身人群',
    '产品特色卖点', '行业首款双拉伸按摩椅',
    '产品主要卖点', '真4D灵犀机芯;柔性黄金导轨',
    '产品次要卖点', '加热;蓝牙音箱;零重力',
    '使用场景', '客厅追剧;运动后恢复;父母养生'
  )),
  description = '用于批量导入产品卖点Brief',
  status = 1
WHERE template_type = 'selling_point';
