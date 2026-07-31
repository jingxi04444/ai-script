CREATE TABLE IF NOT EXISTS ai_brief_share_pack (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  share_token VARCHAR(120) NOT NULL,
  permission VARCHAR(16) NOT NULL DEFAULT 'read',
  enabled TINYINT NOT NULL DEFAULT 1,
  create_by INT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_share_pack_token (share_token),
  KEY idx_ai_brief_share_pack_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief批量分享包';

CREATE TABLE IF NOT EXISTS ai_brief_share_pack_item (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  share_pack_id INT NOT NULL,
  brief_id INT NOT NULL,
  create_by INT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_share_pack_item (share_pack_id, brief_id),
  KEY idx_ai_brief_share_pack_item_brief (brief_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief批量分享包明细';
