-- 页面视觉后台配置。兼容不支持 ADD COLUMN IF NOT EXISTS 的 MySQL 版本。
USE ai_script;

SET @add_home_visual_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'sys_site_config'
      AND column_name = 'front_home_visual_config'
  ),
  'SELECT 1',
  'ALTER TABLE sys_site_config
     ADD COLUMN front_home_visual_config JSON DEFAULT NULL
     COMMENT ''前台主页导航、快捷模块与作品视觉配置''
     AFTER front_original_scenario_prompts'
);

PREPARE add_home_visual_stmt FROM @add_home_visual_sql;
EXECUTE add_home_visual_stmt;
DEALLOCATE PREPARE add_home_visual_stmt;

SET @add_script_visual_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'sys_site_config'
      AND column_name = 'front_script_visual_config'
  ),
  'SELECT 1',
  'ALTER TABLE sys_site_config
     ADD COLUMN front_script_visual_config JSON DEFAULT NULL
     COMMENT ''前台脚本生成器图标与文案视觉配置''
     AFTER front_home_visual_config'
);

PREPARE add_script_visual_stmt FROM @add_script_visual_sql;
EXECUTE add_script_visual_stmt;
DEALLOCATE PREPARE add_script_visual_stmt;
