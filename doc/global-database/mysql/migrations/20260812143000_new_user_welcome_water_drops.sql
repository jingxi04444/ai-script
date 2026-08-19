-- 免费新用户初始铼河水滴：后台通过免费套餐的 NEW_USER_WELCOME_POINT 权益调整赠送数量。
-- 迁移可重复执行；已经由后台修改过的权益值和启用状态不会被覆盖。

SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO ai_membership_benefit_definition (
  benefit_code, benefit_name, category, value_type, unit,
  reset_type, preview_only, enabled, description, display_order
) VALUES (
  'NEW_USER_WELCOME_POINT',
  '新用户初始水滴',
  'point',
  'integer',
  '💧',
  'lifetime',
  0,
  1,
  '首次创建前台账号时一次性赠送，可在后台套餐权益或水滴管理中修改',
  54
)
ON DUPLICATE KEY UPDATE
  benefit_name = VALUES(benefit_name),
  category = VALUES(category),
  value_type = VALUES(value_type),
  unit = VALUES(unit),
  reset_type = VALUES(reset_type),
  preview_only = VALUES(preview_only),
  description = VALUES(description),
  display_order = VALUES(display_order),
  deleted = 0,
  update_time = CURRENT_TIMESTAMP;

INSERT INTO ai_membership_plan_benefit (
  plan_id, benefit_id, benefit_value, enabled
)
SELECT p.id, d.id, '200', 1
FROM ai_membership_plan p
JOIN ai_membership_benefit_definition d
  ON d.benefit_code = 'NEW_USER_WELCOME_POINT'
 AND d.deleted = 0
WHERE p.is_free = 1
  AND p.deleted = 0
ON DUPLICATE KEY UPDATE
  benefit_value = ai_membership_plan_benefit.benefit_value,
  enabled = ai_membership_plan_benefit.enabled,
  deleted = 0;

COMMIT;
