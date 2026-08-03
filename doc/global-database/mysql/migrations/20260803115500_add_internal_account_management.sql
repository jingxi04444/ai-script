-- 内部员工账号管理：标识可由后台人工授予套餐的账号。
-- 执行时间：2026-08-03 11:55:00

DELIMITER $$

DROP PROCEDURE IF EXISTS add_internal_account_management$$
CREATE PROCEDURE add_internal_account_management()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sys_user'
      AND COLUMN_NAME = 'internal_account'
  ) THEN
    ALTER TABLE sys_user
      ADD COLUMN internal_account TINYINT NOT NULL DEFAULT 0
      COMMENT '内部员工账号：0否 1是'
      AFTER member_level;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sys_user'
      AND INDEX_NAME = 'idx_sys_user_internal'
  ) THEN
    ALTER TABLE sys_user
      ADD INDEX idx_sys_user_internal (internal_account, status);
  END IF;

  UPDATE sys_user
  SET internal_account = 1
  WHERE account = 'ultimate-test@ai-script.local'
    AND deleted = 0;
END$$

CALL add_internal_account_management()$$
DROP PROCEDURE IF EXISTS add_internal_account_management$$

DELIMITER ;
