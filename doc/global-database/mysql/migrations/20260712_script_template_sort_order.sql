-- 脚本模板增加后台可维护的展示排序序号。
-- 默认按当前修改时间倒序，为存量模板生成连续序号。
-- Safe to run repeatedly.

USE ai_script;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_script_template_sort_order $$
CREATE PROCEDURE add_script_template_sort_order()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'ai_script_template'
      AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE ai_script_template
      ADD COLUMN sort_order INT NOT NULL DEFAULT 0 COMMENT '展示排序序号，越小越靠前'
      AFTER reference_desc;

    UPDATE ai_script_template target
    JOIN (
      SELECT id, ROW_NUMBER() OVER (ORDER BY update_time DESC, id ASC) AS display_order
      FROM ai_script_template
      WHERE deleted = 0
    ) ranked ON ranked.id = target.id
    SET target.sort_order = ranked.display_order;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'ai_script_template'
      AND index_name = 'idx_ai_script_template_sort'
  ) THEN
    CREATE INDEX idx_ai_script_template_sort
      ON ai_script_template (status, sort_order, update_time);
  END IF;
END $$

CALL add_script_template_sort_order() $$
DROP PROCEDURE IF EXISTS add_script_template_sort_order $$

DELIMITER ;
