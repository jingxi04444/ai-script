-- 2026-08-02 15:59:13 可配置积分包与免费体验期修正

CREATE TABLE IF NOT EXISTS ai_point_package (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  package_code VARCHAR(50) NOT NULL COMMENT '积分包编码',
  package_name VARCHAR(100) NOT NULL COMMENT '积分包名称',
  price DECIMAL(14,2) NOT NULL COMMENT '销售价格',
  points BIGINT NOT NULL COMMENT '到账积分',
  description VARCHAR(500) DEFAULT NULL COMMENT '展示说明',
  display_order INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1启用，0停用',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_point_package_code (package_code),
  KEY idx_point_package_status_order (status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='可售积分包';

INSERT INTO ai_point_package (
  package_code, package_name, price, points, description, display_order, status
) VALUES
  ('points_500', '基础积分包', 10.00, 500, '适合少量补充积分', 10, 1),
  ('points_2500', '进阶积分包', 50.00, 2500, '适合日常内容创作', 20, 1),
  ('points_5000', '专业积分包', 100.00, 5000, '适合稳定批量生产', 30, 1),
  ('points_15000', '团队积分包', 300.00, 15000, '适合团队集中采购', 40, 1)
ON DUPLICATE KEY UPDATE
  package_name = VALUES(package_name),
  price = VALUES(price),
  points = VALUES(points),
  description = VALUES(description),
  display_order = VALUES(display_order),
  status = VALUES(status);

UPDATE ai_membership_plan
SET period_days = 7
WHERE plan_code = 'free';

UPDATE ai_membership_plan_sku sku
JOIN ai_membership_plan plan ON plan.id = sku.plan_id
SET sku.period_unit = 'day', sku.period_count = 7
WHERE plan.plan_code = 'free' AND sku.sku_code = 'free_default';

UPDATE ai_user_subscription subscription
JOIN ai_membership_plan plan ON plan.id = subscription.plan_id
SET subscription.current_period_end = DATE_ADD(subscription.start_time, INTERVAL 7 DAY),
    subscription.update_time = CURRENT_TIMESTAMP
WHERE plan.plan_code = 'free'
  AND subscription.status IN ('active', 'canceling')
  AND subscription.current_period_end > '2099-12-31 23:59:59';
