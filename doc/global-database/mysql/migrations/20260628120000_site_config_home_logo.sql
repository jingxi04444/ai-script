-- 站点配置：支持后台上传并控制用户端首页侧边栏顶部图标。
-- 执行场景：已有数据库升级时执行；全量新库可直接执行 ai_script_mysql_schema.sql + ai_script_mysql_seed.sql。
-- Safe to run repeatedly.

USE ai_script;

CREATE TABLE IF NOT EXISTS sys_site_config (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  config_code VARCHAR(80) NOT NULL COMMENT '配置编码：default',
  front_home_logo_url VARCHAR(1000) DEFAULT NULL COMMENT '用户端首页侧边栏顶部图标URL',
  front_home_logo_key VARCHAR(500) DEFAULT NULL COMMENT '用户端首页侧边栏顶部图标对象存储Key',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_site_config_code (config_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站点展示配置表';

INSERT INTO sys_site_config (
  id, config_code, front_home_logo_url, front_home_logo_key, status
) VALUES (
  1, 'default', NULL, NULL, 1
) ON DUPLICATE KEY UPDATE
  config_code = VALUES(config_code),
  status = VALUES(status);

INSERT INTO sys_permission (
  id, permission_name, permission_code, module_code, permission_type, path, parent_id, icon, sort_order, status
) VALUES
  (14, '站点配置', 'menu:system:site-config', 'system', 'menu', '/admin/system/site-config', 7, 'settings', 76, 1),
  (115, '管理站点配置', 'admin:system:site-config:manage', 'system', 'api', '/api/admin/system/site-config', NULL, NULL, 1015, 1),
  (116, '后台文件上传', 'admin:file:upload', 'asset', 'api', '/api/files/upload', NULL, NULL, 1016, 1)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name),
  module_code = VALUES(module_code),
  permission_type = VALUES(permission_type),
  path = VALUES(path),
  parent_id = VALUES(parent_id),
  icon = VALUES(icon),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 1, id FROM sys_permission
WHERE permission_code IN (
  'menu:system:site-config',
  'admin:system:site-config:manage',
  'admin:file:upload'
)
ON DUPLICATE KEY UPDATE create_time = sys_role_permission.create_time;

INSERT INTO sys_role_permission (role_id, permission_id)
SELECT 2, id FROM sys_permission
WHERE permission_code IN (
  'menu:system:site-config',
  'admin:system:site-config:manage',
  'admin:file:upload'
)
ON DUPLICATE KEY UPDATE create_time = sys_role_permission.create_time;
