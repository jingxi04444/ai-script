-- 2026-08-03 11:36:42 新增至尊版测试账号。
-- 登录账号：ultimate-test@ai-script.local
-- 登录密码：123456
-- 本脚本仅用于测试环境，可重复执行；重复执行会将账号恢复为有效的至尊版单月订阅。
USE ai_script;

SET @ultimate_test_account = 'ultimate-test@ai-script.local';
SET @ultimate_test_password_hash = '$2a$10$oYJvJsOSGQ9F2l1K4cIps.Jp7ghtjbCb5sFugQk5EPD.RIY.ZsJfC';
SET @ultimate_test_source_order = 'TEST-ULTIMATE-ACCOUNT';

INSERT INTO sys_user (
  tenant_id, username, account, password_hash,
  phone, email, user_type, member_level, status, deleted
)
SELECT
  1,
  '至尊版测试账号',
  @ultimate_test_account,
  @ultimate_test_password_hash,
  NULL,
  @ultimate_test_account,
  'front',
  plan.plan_level,
  1,
  0
FROM ai_membership_plan plan
WHERE plan.plan_code = 'ultimate'
  AND plan.deleted = 0
LIMIT 1
ON DUPLICATE KEY UPDATE
  id = LAST_INSERT_ID(id),
  tenant_id = VALUES(tenant_id),
  username = VALUES(username),
  password_hash = VALUES(password_hash),
  email = VALUES(email),
  user_type = VALUES(user_type),
  member_level = VALUES(member_level),
  status = VALUES(status),
  deleted = VALUES(deleted),
  update_time = CURRENT_TIMESTAMP;

SET @ultimate_test_user_id = (
  SELECT id
  FROM sys_user
  WHERE account = @ultimate_test_account
  LIMIT 1
);
INSERT IGNORE INTO sys_user_role (user_id, role_id)
SELECT @ultimate_test_user_id, role.id
FROM sys_role role
WHERE role.role_code = 'front_user'
  AND role.status = 1
  AND role.deleted = 0
ORDER BY (role.tenant_id = 1) DESC, role.id ASC
LIMIT 1;

-- 清理该专用测试账号可能残留的其他有效订阅，避免有效订阅唯一槽冲突。
UPDATE ai_user_subscription
SET status = 'expired',
    auto_renew = 0,
    next_renew_time = NULL,
    cancel_at_period_end = 1,
    update_time = CURRENT_TIMESTAMP
WHERE user_id = @ultimate_test_user_id
  AND status IN ('active', 'canceling', 'past_due')
  AND (source_order_no IS NULL OR source_order_no <> @ultimate_test_source_order);

INSERT INTO ai_user_subscription (
  tenant_id, user_id, plan_id, sku_id,
  status, auto_renew,
  start_time, current_period_start, current_period_end,
  benefit_anchor_time, next_renew_time,
  cancel_at_period_end, cancel_time,
  provider, agreement_no,
  plan_snapshot_json, source_order_no,
  version, create_by, deleted
)
SELECT
  1,
  @ultimate_test_user_id,
  plan.id,
  sku.id,
  'active',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 MONTH),
  CURRENT_TIMESTAMP,
  NULL,
  1,
  NULL,
  'test',
  NULL,
  JSON_OBJECT(
    'planCode', plan.plan_code,
    'planName', plan.plan_name,
    'planLevel', plan.plan_level,
    'skuCode', sku.sku_code,
    'skuName', sku.sku_name,
    'billingMode', sku.billing_mode,
    'testAccount', TRUE
  ),
  @ultimate_test_source_order,
  0,
  @ultimate_test_user_id,
  0
FROM ai_membership_plan plan
JOIN ai_membership_plan_sku sku ON sku.plan_id = plan.id
WHERE plan.plan_code = 'ultimate'
  AND plan.deleted = 0
  AND plan.status = 1
  AND sku.sku_code = 'ultimate_once_month'
  AND sku.deleted = 0
  AND sku.status = 1
LIMIT 1
ON DUPLICATE KEY UPDATE
  tenant_id = VALUES(tenant_id),
  plan_id = VALUES(plan_id),
  sku_id = VALUES(sku_id),
  status = VALUES(status),
  auto_renew = VALUES(auto_renew),
  start_time = VALUES(start_time),
  current_period_start = VALUES(current_period_start),
  current_period_end = VALUES(current_period_end),
  benefit_anchor_time = VALUES(benefit_anchor_time),
  next_renew_time = VALUES(next_renew_time),
  cancel_at_period_end = VALUES(cancel_at_period_end),
  cancel_time = VALUES(cancel_time),
  provider = VALUES(provider),
  agreement_no = VALUES(agreement_no),
  plan_snapshot_json = VALUES(plan_snapshot_json),
  source_order_no = VALUES(source_order_no),
  version = 0,
  deleted = 0,
  update_time = CURRENT_TIMESTAMP;

-- 为权限消耗测试准备积分；重复执行不会扣减或覆盖更高的现有余额。
INSERT INTO ai_point_account (
  tenant_id, user_id, available_points, frozen_points, version
) VALUES (
  1, @ultimate_test_user_id, 100000, 0, 0
)
ON DUPLICATE KEY UPDATE
  available_points = GREATEST(available_points, VALUES(available_points)),
  frozen_points = 0,
  version = version + 1,
  update_time = CURRENT_TIMESTAMP;

-- 执行结果核对。
SELECT
  user.id AS user_id,
  user.account,
  user.member_level,
  plan.plan_code,
  plan.plan_name,
  sku.sku_code,
  subscription.status AS subscription_status,
  subscription.current_period_end,
  points.available_points
FROM sys_user user
JOIN ai_user_subscription subscription
  ON subscription.user_id = user.id
  AND subscription.status IN ('active', 'canceling', 'past_due')
JOIN ai_membership_plan plan ON plan.id = subscription.plan_id
LEFT JOIN ai_membership_plan_sku sku ON sku.id = subscription.sku_id
LEFT JOIN ai_point_account points ON points.user_id = user.id
WHERE user.account = @ultimate_test_account;
