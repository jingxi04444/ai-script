-- 2026-08-02 13:52:00
-- 修复历史账号仅在 account 中保存邮箱、email 字段为空，导致邮箱登录后仍要求绑定邮箱的问题。

UPDATE sys_user
SET email = LOWER(TRIM(account)),
    update_time = CURRENT_TIMESTAMP
WHERE (email IS NULL OR TRIM(email) = '')
  AND TRIM(account) REGEXP '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$';
