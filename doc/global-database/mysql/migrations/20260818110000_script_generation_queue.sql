CREATE TABLE IF NOT EXISTS ai_script_generation_queue_item (
  id BIGINT NOT NULL COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  project_id INT NOT NULL COMMENT '项目ID',
  batch_no VARCHAR(64) NOT NULL COMMENT '连续入队批次号',
  request_no VARCHAR(80) NOT NULL COMMENT '前端幂等请求号',
  script_type VARCHAR(32) NOT NULL COMMENT '脚本类型',
  task_label VARCHAR(120) NOT NULL COMMENT '队列展示名称',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT 'pending/running/success/failed/canceled',
  request_payload JSON NOT NULL COMMENT '脚本生成请求快照',
  script_id INT DEFAULT NULL COMMENT '成功生成的脚本ID',
  error_message TEXT DEFAULT NULL COMMENT '失败原因',
  start_time DATETIME DEFAULT NULL COMMENT '开始执行时间',
  finish_time DATETIME DEFAULT NULL COMMENT '结束时间',
  create_by INT NOT NULL COMMENT '创建人',
  update_by INT DEFAULT NULL COMMENT '更新人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_script_queue_request (tenant_id, create_by, request_no),
  KEY idx_script_queue_dispatch (status, tenant_id, create_by, id),
  KEY idx_script_queue_batch (batch_no, status),
  KEY idx_script_queue_project (project_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本后台生成队列';

CREATE TABLE IF NOT EXISTS ai_script_queue_setting (
  id BIGINT NOT NULL COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  user_id INT NOT NULL COMMENT '用户ID',
  concurrency_limit INT NOT NULL DEFAULT 1 COMMENT '用户选择的脚本生成并发数',
  create_by INT DEFAULT NULL,
  update_by INT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_script_queue_setting_user (tenant_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本生成队列个人设置';

INSERT INTO ai_membership_benefit_definition (
  benefit_code, benefit_name, category, value_type, unit,
  reset_type, preview_only, enabled, description, display_order
) VALUES (
  'SCRIPT_QUEUE_CONCURRENCY_LIMIT', '脚本队列并发数', 'script', 'integer', '个',
  'none', 0, 1, '普通套餐固定串行，至尊版可配置并行生成', 13
)
ON DUPLICATE KEY UPDATE
  benefit_name = VALUES(benefit_name),
  category = VALUES(category),
  value_type = VALUES(value_type),
  unit = VALUES(unit),
  reset_type = VALUES(reset_type),
  preview_only = VALUES(preview_only),
  enabled = VALUES(enabled),
  description = VALUES(description),
  display_order = VALUES(display_order);

INSERT INTO ai_membership_plan_benefit (plan_id, benefit_id, benefit_value, enabled)
SELECT p.id, d.id,
  CASE WHEN p.plan_code = 'ultimate' THEN '8' ELSE '1' END,
  1
FROM ai_membership_plan p
JOIN ai_membership_benefit_definition d
  ON d.benefit_code = 'SCRIPT_QUEUE_CONCURRENCY_LIMIT' AND d.deleted = 0
WHERE p.plan_code IN ('free', 'light', 'pro', 'ultimate') AND p.deleted = 0
ON DUPLICATE KEY UPDATE
  benefit_value = VALUES(benefit_value),
  enabled = VALUES(enabled),
  update_time = CURRENT_TIMESTAMP;
