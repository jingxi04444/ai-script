-- 2026-08-10 项目协作链接与单脚本评审链接
-- 两种授权均为资源关系，不改变 sys_user 的全局角色。

CREATE TABLE IF NOT EXISTS ai_project_collaboration_link (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  project_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at DATETIME NULL,
  max_uses INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  create_by INT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_collaboration_token (token_hash),
  KEY idx_project_collaboration_project (tenant_id, project_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目协作邀请链接';

CREATE TABLE IF NOT EXISTS ai_project_collaborator (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_link_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  create_by INT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_collaborator (tenant_id, project_id, user_id),
  KEY idx_project_collaborator_user (tenant_id, user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目协作成员关系';

CREATE TABLE IF NOT EXISTS ai_script_review_link (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  script_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  version_scope VARCHAR(20) NOT NULL DEFAULT 'all',
  fixed_version_id INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  expires_at DATETIME NULL,
  max_uses INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  create_by INT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_script_review_token (token_hash),
  KEY idx_script_review_script (tenant_id, script_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='单脚本评审分享链接';

CREATE TABLE IF NOT EXISTS ai_script_review_access (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  review_link_id INT NOT NULL,
  script_id INT NOT NULL,
  user_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_access_time DATETIME NULL,
  create_by INT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_script_review_access (review_link_id, user_id),
  KEY idx_script_review_access_user (tenant_id, user_id, script_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本评审访问绑定';

CREATE TABLE IF NOT EXISTS ai_script_review_comment (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  script_id INT NOT NULL,
  review_link_id INT NULL,
  version_id INT NULL,
  user_id INT NOT NULL,
  parent_id INT NULL,
  row_index INT NULL,
  column_key VARCHAR(64) NULL,
  content TEXT NOT NULL,
  comment_status VARCHAR(20) NOT NULL DEFAULT 'open',
  create_by INT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_script_review_comment (tenant_id, script_id, version_id, create_time),
  KEY idx_script_review_comment_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本评审批注与回复';

CREATE TABLE IF NOT EXISTS ai_script_review_record (
  id INT NOT NULL AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  script_id INT NOT NULL,
  review_link_id INT NULL,
  version_id INT NULL,
  user_id INT NOT NULL,
  decision VARCHAR(32) NOT NULL,
  opinion TEXT NULL,
  create_by INT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_script_review_record (tenant_id, script_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本评审结论记录';
