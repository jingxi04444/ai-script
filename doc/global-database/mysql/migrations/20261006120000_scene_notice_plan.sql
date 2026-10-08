CREATE TABLE IF NOT EXISTS ai_scene_notice_plan (
  id BIGINT NOT NULL COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  version INT NOT NULL DEFAULT 1 COMMENT '通告图版本',
  draft_json JSON NOT NULL COMMENT '场景和拍摄配置',
  plan_json JSON NOT NULL COMMENT '服务端分配后的场景与产品通告表',
  create_by INT NOT NULL COMMENT '创建人',
  update_by INT DEFAULT NULL COMMENT '更新人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_scene_notice_owner (tenant_id, project_id, create_by),
  KEY idx_ai_scene_notice_project (project_id, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目场景拍摄通告图';
