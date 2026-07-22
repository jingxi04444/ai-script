-- Add Brief collaboration/edit-request tables for existing ai_script databases.
-- Run this when upgrading an existing database created before this feature.

USE ai_script;

CREATE TABLE IF NOT EXISTS ai_brief_collaborator (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT NOT NULL COMMENT 'Brief ID',
  user_id INT NOT NULL COMMENT '协作者用户ID',
  permission VARCHAR(32) NOT NULL DEFAULT 'edit' COMMENT '权限：edit',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1有效/0禁用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_brief_collaborator_user (brief_id, user_id),
  KEY idx_ai_brief_collaborator_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief协作者表';

CREATE TABLE IF NOT EXISTS ai_brief_edit_request (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  brief_id INT NOT NULL COMMENT 'Brief ID',
  requester_id INT NOT NULL COMMENT '申请人用户ID',
  owner_id INT NOT NULL COMMENT 'Brief拥有者用户ID',
  request_message VARCHAR(500) DEFAULT NULL COMMENT '申请说明',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态：pending/approved/rejected',
  approve_time DATETIME DEFAULT NULL COMMENT '审批时间',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_brief_edit_request_brief (brief_id),
  KEY idx_ai_brief_edit_request_owner (owner_id, status),
  KEY idx_ai_brief_edit_request_requester (requester_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Brief编辑权限申请表';
