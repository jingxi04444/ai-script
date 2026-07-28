-- 项目引用共享 Brief：执行后，共享 Brief 可关联到接收方项目并持续读取源 Brief 最新内容。
CREATE TABLE IF NOT EXISTS ai_project_brief_ref (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '接收方项目ID',
  brief_id INT NOT NULL COMMENT '共享Brief ID',
  create_by INT DEFAULT NULL COMMENT '关联人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_project_brief_ref (project_id, brief_id),
  KEY idx_ai_project_brief_ref_brief (brief_id),
  KEY idx_ai_project_brief_ref_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目共享Brief引用表';