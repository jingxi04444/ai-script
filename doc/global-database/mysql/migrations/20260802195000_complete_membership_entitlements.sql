-- 2026-08-02 19:50:00 补齐会员等级权限：任务并发占用与至尊模板定制工单
USE ai_script;

DROP PROCEDURE IF EXISTS add_membership_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_membership_column_if_missing(
  IN table_name_value VARCHAR(64),
  IN column_name_value VARCHAR(64),
  IN ddl_sql TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = column_name_value
  ) THEN
    SET @membership_ddl = ddl_sql;
    PREPARE membership_statement FROM @membership_ddl;
    EXECUTE membership_statement;
    DEALLOCATE PREPARE membership_statement;
  END IF;
END $$
DELIMITER ;

CALL add_membership_column_if_missing(
  'ai_generation_task',
  'quota_request_no',
  'ALTER TABLE ai_generation_task ADD COLUMN quota_request_no VARCHAR(100) DEFAULT NULL COMMENT ''并发任务额度预占请求号'' AFTER idempotency_key'
);

DROP PROCEDURE IF EXISTS add_membership_column_if_missing;

CREATE TABLE IF NOT EXISTS ai_template_custom_request (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  user_id INT NOT NULL COMMENT '申请用户ID',
  plan_id BIGINT NOT NULL COMMENT '申请时会员套餐ID',
  title VARCHAR(120) NOT NULL COMMENT '定制模板标题',
  requirements TEXT NOT NULL COMMENT '定制需求',
  contact VARCHAR(200) DEFAULT NULL COMMENT '联系方式',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending/processing/completed/rejected',
  admin_remark VARCHAR(1000) DEFAULT NULL COMMENT '后台处理备注',
  handled_by INT DEFAULT NULL COMMENT '处理人',
  handled_time DATETIME DEFAULT NULL COMMENT '处理时间',
  create_by INT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by INT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_template_custom_user (tenant_id, user_id, create_time),
  KEY idx_template_custom_status (status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='至尊会员独家定制模板工单';

-- 积分包 points 作为轻量版（500积分/10元）的基础值，兼容新旧 package_code，避免已有库唯一键冲突。
UPDATE ai_point_package SET points = 2500 WHERE package_code IN ('points_2500', 'points_3000');
UPDATE ai_point_package SET points = 5000 WHERE package_code IN ('points_5000', 'points_6500');
UPDATE ai_point_package SET points = 15000 WHERE package_code IN ('points_15000', 'points_21000');
