-- 首页轮播：使用独立数据表维护，不依赖站点配置 JSON。
-- Safe to run repeatedly.

USE ai_script;

DELIMITER $$

DROP PROCEDURE IF EXISTS drop_legacy_home_banners_json $$
CREATE PROCEDURE drop_legacy_home_banners_json()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'sys_site_config'
      AND column_name = 'front_home_banners_json'
  ) THEN
    ALTER TABLE sys_site_config DROP COLUMN front_home_banners_json;
  END IF;
END $$

CALL drop_legacy_home_banners_json() $$
DROP PROCEDURE IF EXISTS drop_legacy_home_banners_json $$

DELIMITER ;

CREATE TABLE IF NOT EXISTS sys_home_banner (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  title VARCHAR(160) NOT NULL COMMENT '轮播标题',
  subtitle VARCHAR(300) DEFAULT NULL COMMENT '轮播副标题',
  image_url VARCHAR(1000) DEFAULT NULL COMMENT '轮播图片URL',
  image_key VARCHAR(500) DEFAULT NULL COMMENT '轮播图片存储Key',
  link_url VARCHAR(1000) DEFAULT NULL COMMENT '点击跳转地址',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序，越小越靠前',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0停用 1启用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_sys_home_banner_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页轮播图表';

INSERT INTO sys_home_banner (id, title, subtitle, link_url, sort_order, status) VALUES
  (1, 'Seedance 2.0 上线', '解锁真人生成 丝滑无需排队', '/workspace', 10, 1),
  (2, '纳米大片挑战赛', 'AI 驱动的商业短视频脚本生成', '/workspace', 20, 1),
  (3, '纳米 Image 2.0 超清图片模型上线', '画质提升 精准编辑 超强思考 文字渲染', '/workspace', 30, 1)
ON DUPLICATE KEY UPDATE
  title = VALUES(title), subtitle = VALUES(subtitle), link_url = VALUES(link_url),
  sort_order = VALUES(sort_order), status = VALUES(status);

INSERT INTO sys_permission (
  id, permission_name, permission_code, module_code, permission_type, path, parent_id, icon, sort_order, status
) VALUES
  (15, '首页轮播', 'menu:system:home-banner', 'system', 'menu', '/admin/system/home-banners', 7, 'image', 77, 1),
  (117, '管理首页轮播', 'admin:system:home-banner:manage', 'system', 'api', '/api/admin/system/home-banners/**', NULL, NULL, 1017, 1)
ON DUPLICATE KEY UPDATE
  permission_name = VALUES(permission_name), permission_code = VALUES(permission_code),
  module_code = VALUES(module_code), permission_type = VALUES(permission_type), path = VALUES(path),
  parent_id = VALUES(parent_id), icon = VALUES(icon), sort_order = VALUES(sort_order), status = VALUES(status);

INSERT INTO sys_role_permission (role_id, permission_id)
SELECT id_role.id, permission.id
FROM sys_role id_role
JOIN sys_permission permission ON permission.permission_code IN ('menu:system:home-banner', 'admin:system:home-banner:manage')
WHERE id_role.id IN (1, 2)
ON DUPLICATE KEY UPDATE create_time = sys_role_permission.create_time;
