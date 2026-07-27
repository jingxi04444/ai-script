CREATE TABLE IF NOT EXISTS ai_brief_share_link (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT NOT NULL COMMENT 'Brief ID',
  share_token VARCHAR(120) NOT NULL COMMENT '分享token',
  permission VARCHAR(16) NOT NULL COMMENT '链接权限：read/edit/manage',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1有效/0禁用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_share_link_token (share_token),
  UNIQUE KEY uk_ai_brief_share_link_permission (brief_id, permission),
  KEY idx_ai_brief_share_link_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief分权限分享链接表';

INSERT INTO ai_brief_share_link (
  tenant_id,
  brief_id,
  share_token,
  permission,
  enabled,
  create_by,
  create_time,
  update_by,
  update_time,
  deleted
)
SELECT
  tenant_id,
  id,
  share_token,
  COALESCE(NULLIF(share_permission, ''), 'read'),
  share_enabled,
  create_by,
  COALESCE(share_time, create_time),
  update_by,
  update_time,
  0
FROM ai_brief
WHERE share_token IS NOT NULL
  AND share_token <> ''
  AND share_enabled = 1
ON DUPLICATE KEY UPDATE
  enabled = VALUES(enabled),
  update_time = VALUES(update_time);
