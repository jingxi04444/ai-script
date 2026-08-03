-- 修复 /api/membership/current 查询所需的订阅表字段。
-- 执行时间：2026-08-03 12:31:07
-- 可重复执行，兼容已经执行过 20260801090000 迁移的数据库。

DELIMITER $$

DROP PROCEDURE IF EXISTS repair_subscription_current_schema$$
CREATE PROCEDURE repair_subscription_current_schema()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ai_user_subscription'
      AND COLUMN_NAME = 'grace_end_time'
  ) THEN
    ALTER TABLE ai_user_subscription
      ADD COLUMN grace_end_time DATETIME NULL
      COMMENT '自动续费失败后的宽限期结束时间'
      AFTER next_renew_time;
  END IF;
END$$

CALL repair_subscription_current_schema()$$
DROP PROCEDURE IF EXISTS repair_subscription_current_schema$$

DELIMITER ;
