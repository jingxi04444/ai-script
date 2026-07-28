-- 修复历史前台账号缺少默认角色导致登录后所有业务接口返回 403 的问题。
INSERT INTO sys_user_role (user_id, role_id)
SELECT front_user.id,
       (
         SELECT front_role.id
         FROM sys_role front_role
         WHERE front_role.role_code = 'front_user'
           AND front_role.status = 1
           AND front_role.deleted = 0
           AND (front_role.tenant_id = front_user.tenant_id OR front_role.tenant_id IS NULL)
         ORDER BY (front_role.tenant_id = front_user.tenant_id) DESC, front_role.id
         LIMIT 1
       ) AS role_id
FROM sys_user front_user
LEFT JOIN sys_user_role user_role
  ON user_role.user_id = front_user.id
WHERE front_user.user_type = 'front'
  AND front_user.status = 1
  AND front_user.deleted = 0
  AND user_role.user_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM sys_role front_role
    WHERE front_role.role_code = 'front_user'
      AND front_role.status = 1
      AND front_role.deleted = 0
      AND (front_role.tenant_id = front_user.tenant_id OR front_role.tenant_id IS NULL)
  )
ON DUPLICATE KEY UPDATE create_time = sys_user_role.create_time;