USE ai_script;

-- 下架旧版“一个周期一条套餐”的测试数据，保留记录供历史订单查询。
UPDATE ai_membership_plan
SET status = 0
WHERE plan_code IN ('pro_month', 'pro_quarter', 'pro_year');

INSERT INTO ai_membership_plan (
  plan_code, plan_name, plan_level, is_free,
  period_days, price, benefits_json,
  description, display_order, status
) VALUES
  ('free', '免费体验版', 0, 1, 30, 0.00, NULL, '免费体验基础能力，脚本次数由权益配置控制', 10, 1),
  ('light', '轻量版', 10, 0, 30, 79.00, NULL, '适合个人与轻量内容创作', 20, 1),
  ('pro', '专业版', 20, 0, 30, 239.00, NULL, '适合稳定批量内容生产', 30, 1),
  ('ultimate', '至尊版', 30, 0, 30, 649.00, NULL, '适合团队协作与高频生产', 40, 1)
ON DUPLICATE KEY UPDATE
  plan_name = VALUES(plan_name),
  plan_level = VALUES(plan_level),
  is_free = VALUES(is_free),
  description = VALUES(description),
  display_order = VALUES(display_order),
  status = VALUES(status);

INSERT INTO ai_membership_plan_sku (
  plan_id, sku_code, sku_name, billing_mode,
  period_unit, period_count, price, original_price,
  refund_days, status, display_order
)
SELECT p.id, sku.sku_code, sku.sku_name, sku.billing_mode,
       sku.period_unit, sku.period_count, sku.price, sku.original_price,
       sku.refund_days, 1, sku.display_order
FROM ai_membership_plan p
JOIN (
  SELECT 'free' plan_code, 'free_default' sku_code, '免费体验版' sku_name,
         'one_time' billing_mode, 'month' period_unit, 1 period_count,
         0.00 price, 0.00 original_price, 0 refund_days, 10 display_order
  UNION ALL SELECT 'light', 'light_once_month', '轻量版单月', 'one_time', 'month', 1, 79.00, 79.00, 3, 20
  UNION ALL SELECT 'light', 'light_auto_month', '轻量版连续包月', 'auto_renew', 'month', 1, 59.00, 79.00, 3, 21
  UNION ALL SELECT 'light', 'light_auto_quarter', '轻量版连续包季', 'auto_renew', 'quarter', 1, 135.00, 237.00, 3, 22
  UNION ALL SELECT 'light', 'light_auto_year', '轻量版连续包年', 'auto_renew', 'year', 1, 499.00, 948.00, 3, 23
  UNION ALL SELECT 'pro', 'pro_once_month', '专业版单月', 'one_time', 'month', 1, 239.00, 239.00, 7, 30
  UNION ALL SELECT 'pro', 'pro_auto_month', '专业版连续包月', 'auto_renew', 'month', 1, 199.00, 239.00, 7, 31
  UNION ALL SELECT 'pro', 'pro_auto_quarter', '专业版连续包季', 'auto_renew', 'quarter', 1, 499.00, 717.00, 7, 32
  UNION ALL SELECT 'pro', 'pro_auto_year', '专业版连续包年', 'auto_renew', 'year', 1, 1499.00, 2868.00, 7, 33
  UNION ALL SELECT 'ultimate', 'ultimate_once_month', '至尊版单月', 'one_time', 'month', 1, 649.00, 649.00, 15, 40
  UNION ALL SELECT 'ultimate', 'ultimate_auto_month', '至尊版连续包月', 'auto_renew', 'month', 1, 499.00, 649.00, 15, 41
  UNION ALL SELECT 'ultimate', 'ultimate_auto_quarter', '至尊版连续包季', 'auto_renew', 'quarter', 1, 1469.00, 1947.00, 15, 42
  UNION ALL SELECT 'ultimate', 'ultimate_auto_year', '至尊版连续包年', 'auto_renew', 'year', 1, 3999.00, 7788.00, 15, 43
) sku ON sku.plan_code = p.plan_code
ON DUPLICATE KEY UPDATE
  plan_id = VALUES(plan_id),
  sku_name = VALUES(sku_name),
  billing_mode = VALUES(billing_mode),
  period_unit = VALUES(period_unit),
  period_count = VALUES(period_count),
  price = VALUES(price),
  original_price = VALUES(original_price),
  refund_days = VALUES(refund_days),
  status = VALUES(status),
  display_order = VALUES(display_order);

INSERT INTO ai_membership_benefit_definition (
  benefit_code, benefit_name, category, value_type, unit,
  reset_type, preview_only, enabled, description, display_order
) VALUES
  ('SCRIPT_MONTHLY_LIMIT', '脚本月度生成额度', 'script', 'integer', '次', 'membership_month', 0, 1, '按会员开通日逐月重置', 10),
  ('BRIEF_MAX_ACTIVE', '当前有效Brief数量', 'brief', 'integer', '个', 'none', 0, 1, '去重统计用户当前可用Brief', 20),
  ('BRIEF_DETECT_ACCESS', 'Brief检测权限', 'brief', 'boolean', NULL, 'none', 0, 1, NULL, 21),
  ('BRIEF_DETECT_POINT_COST', 'Brief检测积分消耗', 'brief', 'integer', '积分/次', 'none', 0, 1, NULL, 22),
  ('BRIEF_BATCH_IMPORT', 'Brief批量导入', 'brief', 'boolean', NULL, 'none', 0, 1, NULL, 23),
  ('BRIEF_COLLABORATION', 'Brief账号共享协作', 'brief', 'boolean', NULL, 'none', 0, 1, NULL, 24),
  ('TEMPLATE_ACCESS_SCOPE', '模板访问范围', 'template', 'string', NULL, 'none', 0, 1, 'free_only/all', 30),
  ('HOT_TEMPLATE_ACCESS', '热点模板访问', 'template', 'boolean', NULL, 'none', 0, 1, NULL, 31),
  ('CUSTOM_TEMPLATE_LIMIT', '自定义模板保存上限', 'template', 'integer', '个', 'none', 0, 1, NULL, 32),
  ('EXCLUSIVE_TEMPLATE_REQUEST', '独家定制模板工单', 'template', 'boolean', NULL, 'none', 0, 1, NULL, 33),
  ('VIRAL_SIMPLE_ACCESS', '爆款简易解析权限', 'viral', 'boolean', NULL, 'none', 0, 1, NULL, 40),
  ('VIRAL_SIMPLE_POINT_COST', '爆款简易解析积分消耗', 'viral', 'integer', '积分/次', 'none', 0, 1, NULL, 41),
  ('VIRAL_SIMPLE_TRIAL_LIMIT', '爆款简易解析试用次数', 'viral', 'integer', '次', 'lifetime', 0, 1, NULL, 42),
  ('VIRAL_DEEP_ACCESS', '爆款深度解析权限', 'viral', 'boolean', NULL, 'none', 0, 1, NULL, 43),
  ('VIRAL_DEEP_POINT_COST', '爆款深度解析积分消耗', 'viral', 'integer', '积分/次', 'none', 0, 1, NULL, 44),
  ('POINT_PURCHASE_ACCESS', '积分购买权限', 'point', 'boolean', NULL, 'none', 0, 1, NULL, 50),
  ('POINTS_PER_10_YUAN', '每10元购买积分数', 'point', 'integer', '积分', 'none', 0, 1, NULL, 51),
  ('DAILY_LOGIN_POINT', '每日登录积分奖励', 'point', 'integer', '积分', 'day', 0, 1, NULL, 52),
  ('VIDEO_LAUNCH_BONUS_POINT', '视频功能上线赠送积分', 'point', 'integer', '积分', 'lifetime', 1, 0, '视频功能上线时再启用', 53),
  ('REMOVE_WATERMARK', '去品牌水印', 'common', 'boolean', NULL, 'none', 0, 1, NULL, 60),
  ('TASK_CONCURRENCY_LIMIT', '并发任务数上限', 'common', 'integer', '个', 'none', 0, 1, NULL, 61),
  ('STORAGE_LIMIT_BYTES', '云端存储空间', 'common', 'integer', 'Byte', 'none', 0, 1, NULL, 62),
  ('VIDEO_IMAGE_LIMIT', '视频图片生成额度', 'video', 'integer', '张', 'membership_month', 1, 0, '预告权益，暂不执行限流', 70),
  ('VIDEO_GENERATE_LIMIT', '视频生成额度', 'video', 'integer', '个', 'membership_month', 1, 0, '预告权益，暂不执行限流', 71)
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

INSERT INTO ai_membership_plan_benefit (
  plan_id, benefit_id, benefit_value, enabled
)
SELECT p.id, d.id, benefit_values.benefit_value, 1
FROM JSON_TABLE(
  '[
    {"plan":"free","code":"SCRIPT_MONTHLY_LIMIT","value":"3"},
    {"plan":"free","code":"BRIEF_MAX_ACTIVE","value":"0"},
    {"plan":"free","code":"BRIEF_DETECT_ACCESS","value":"false"},
    {"plan":"free","code":"BRIEF_DETECT_POINT_COST","value":"0"},
    {"plan":"free","code":"BRIEF_BATCH_IMPORT","value":"false"},
    {"plan":"free","code":"BRIEF_COLLABORATION","value":"false"},
    {"plan":"free","code":"TEMPLATE_ACCESS_SCOPE","value":"free_only"},
    {"plan":"free","code":"HOT_TEMPLATE_ACCESS","value":"false"},
    {"plan":"free","code":"CUSTOM_TEMPLATE_LIMIT","value":"0"},
    {"plan":"free","code":"EXCLUSIVE_TEMPLATE_REQUEST","value":"false"},
    {"plan":"free","code":"VIRAL_SIMPLE_ACCESS","value":"true"},
    {"plan":"free","code":"VIRAL_SIMPLE_POINT_COST","value":"0"},
    {"plan":"free","code":"VIRAL_SIMPLE_TRIAL_LIMIT","value":"1"},
    {"plan":"free","code":"VIRAL_DEEP_ACCESS","value":"false"},
    {"plan":"free","code":"VIRAL_DEEP_POINT_COST","value":"0"},
    {"plan":"free","code":"POINT_PURCHASE_ACCESS","value":"false"},
    {"plan":"free","code":"POINTS_PER_10_YUAN","value":"0"},
    {"plan":"free","code":"DAILY_LOGIN_POINT","value":"10"},
    {"plan":"free","code":"VIDEO_LAUNCH_BONUS_POINT","value":"0"},
    {"plan":"free","code":"REMOVE_WATERMARK","value":"false"},
    {"plan":"free","code":"TASK_CONCURRENCY_LIMIT","value":"1"},
    {"plan":"free","code":"STORAGE_LIMIT_BYTES","value":"3221225472"},
    {"plan":"free","code":"VIDEO_IMAGE_LIMIT","value":"500"},
    {"plan":"free","code":"VIDEO_GENERATE_LIMIT","value":"80"},

    {"plan":"light","code":"SCRIPT_MONTHLY_LIMIT","value":"50"},
    {"plan":"light","code":"BRIEF_MAX_ACTIVE","value":"10"},
    {"plan":"light","code":"BRIEF_DETECT_ACCESS","value":"true"},
    {"plan":"light","code":"BRIEF_DETECT_POINT_COST","value":"30"},
    {"plan":"light","code":"BRIEF_BATCH_IMPORT","value":"false"},
    {"plan":"light","code":"BRIEF_COLLABORATION","value":"false"},
    {"plan":"light","code":"TEMPLATE_ACCESS_SCOPE","value":"all"},
    {"plan":"light","code":"HOT_TEMPLATE_ACCESS","value":"false"},
    {"plan":"light","code":"CUSTOM_TEMPLATE_LIMIT","value":"0"},
    {"plan":"light","code":"EXCLUSIVE_TEMPLATE_REQUEST","value":"false"},
    {"plan":"light","code":"VIRAL_SIMPLE_ACCESS","value":"true"},
    {"plan":"light","code":"VIRAL_SIMPLE_POINT_COST","value":"30"},
    {"plan":"light","code":"VIRAL_SIMPLE_TRIAL_LIMIT","value":"0"},
    {"plan":"light","code":"VIRAL_DEEP_ACCESS","value":"true"},
    {"plan":"light","code":"VIRAL_DEEP_POINT_COST","value":"60"},
    {"plan":"light","code":"POINT_PURCHASE_ACCESS","value":"true"},
    {"plan":"light","code":"POINTS_PER_10_YUAN","value":"500"},
    {"plan":"light","code":"DAILY_LOGIN_POINT","value":"20"},
    {"plan":"light","code":"VIDEO_LAUNCH_BONUS_POINT","value":"500"},
    {"plan":"light","code":"REMOVE_WATERMARK","value":"false"},
    {"plan":"light","code":"TASK_CONCURRENCY_LIMIT","value":"3"},
    {"plan":"light","code":"STORAGE_LIMIT_BYTES","value":"32212254720"},
    {"plan":"light","code":"VIDEO_IMAGE_LIMIT","value":"6000"},
    {"plan":"light","code":"VIDEO_GENERATE_LIMIT","value":"200"},

    {"plan":"pro","code":"SCRIPT_MONTHLY_LIMIT","value":"150"},
    {"plan":"pro","code":"BRIEF_MAX_ACTIVE","value":"30"},
    {"plan":"pro","code":"BRIEF_DETECT_ACCESS","value":"true"},
    {"plan":"pro","code":"BRIEF_DETECT_POINT_COST","value":"25"},
    {"plan":"pro","code":"BRIEF_BATCH_IMPORT","value":"true"},
    {"plan":"pro","code":"BRIEF_COLLABORATION","value":"false"},
    {"plan":"pro","code":"TEMPLATE_ACCESS_SCOPE","value":"all"},
    {"plan":"pro","code":"HOT_TEMPLATE_ACCESS","value":"true"},
    {"plan":"pro","code":"CUSTOM_TEMPLATE_LIMIT","value":"10"},
    {"plan":"pro","code":"EXCLUSIVE_TEMPLATE_REQUEST","value":"false"},
    {"plan":"pro","code":"VIRAL_SIMPLE_ACCESS","value":"true"},
    {"plan":"pro","code":"VIRAL_SIMPLE_POINT_COST","value":"25"},
    {"plan":"pro","code":"VIRAL_SIMPLE_TRIAL_LIMIT","value":"0"},
    {"plan":"pro","code":"VIRAL_DEEP_ACCESS","value":"true"},
    {"plan":"pro","code":"VIRAL_DEEP_POINT_COST","value":"50"},
    {"plan":"pro","code":"POINT_PURCHASE_ACCESS","value":"true"},
    {"plan":"pro","code":"POINTS_PER_10_YUAN","value":"550"},
    {"plan":"pro","code":"DAILY_LOGIN_POINT","value":"50"},
    {"plan":"pro","code":"VIDEO_LAUNCH_BONUS_POINT","value":"2000"},
    {"plan":"pro","code":"REMOVE_WATERMARK","value":"true"},
    {"plan":"pro","code":"TASK_CONCURRENCY_LIMIT","value":"8"},
    {"plan":"pro","code":"STORAGE_LIMIT_BYTES","value":"107374182400"},
    {"plan":"pro","code":"VIDEO_IMAGE_LIMIT","value":"6000"},
    {"plan":"pro","code":"VIDEO_GENERATE_LIMIT","value":"1000"},

    {"plan":"ultimate","code":"SCRIPT_MONTHLY_LIMIT","value":"500"},
    {"plan":"ultimate","code":"BRIEF_MAX_ACTIVE","value":"unlimited"},
    {"plan":"ultimate","code":"BRIEF_DETECT_ACCESS","value":"true"},
    {"plan":"ultimate","code":"BRIEF_DETECT_POINT_COST","value":"20"},
    {"plan":"ultimate","code":"BRIEF_BATCH_IMPORT","value":"true"},
    {"plan":"ultimate","code":"BRIEF_COLLABORATION","value":"true"},
    {"plan":"ultimate","code":"TEMPLATE_ACCESS_SCOPE","value":"all"},
    {"plan":"ultimate","code":"HOT_TEMPLATE_ACCESS","value":"true"},
    {"plan":"ultimate","code":"CUSTOM_TEMPLATE_LIMIT","value":"unlimited"},
    {"plan":"ultimate","code":"EXCLUSIVE_TEMPLATE_REQUEST","value":"true"},
    {"plan":"ultimate","code":"VIRAL_SIMPLE_ACCESS","value":"true"},
    {"plan":"ultimate","code":"VIRAL_SIMPLE_POINT_COST","value":"20"},
    {"plan":"ultimate","code":"VIRAL_SIMPLE_TRIAL_LIMIT","value":"0"},
    {"plan":"ultimate","code":"VIRAL_DEEP_ACCESS","value":"true"},
    {"plan":"ultimate","code":"VIRAL_DEEP_POINT_COST","value":"40"},
    {"plan":"ultimate","code":"POINT_PURCHASE_ACCESS","value":"true"},
    {"plan":"ultimate","code":"POINTS_PER_10_YUAN","value":"600"},
    {"plan":"ultimate","code":"DAILY_LOGIN_POINT","value":"100"},
    {"plan":"ultimate","code":"VIDEO_LAUNCH_BONUS_POINT","value":"5000"},
    {"plan":"ultimate","code":"REMOVE_WATERMARK","value":"true"},
    {"plan":"ultimate","code":"TASK_CONCURRENCY_LIMIT","value":"unlimited"},
    {"plan":"ultimate","code":"STORAGE_LIMIT_BYTES","value":"322122547200"},
    {"plan":"ultimate","code":"VIDEO_IMAGE_LIMIT","value":"6000"},
    {"plan":"ultimate","code":"VIDEO_GENERATE_LIMIT","value":"1000"}
  ]',
  '$[*]' COLUMNS (
    plan_code VARCHAR(40) PATH '$.plan',
    benefit_code VARCHAR(80) PATH '$.code',
    benefit_value VARCHAR(500) PATH '$.value'
  )
) benefit_values
JOIN ai_membership_plan p ON p.plan_code = benefit_values.plan_code
JOIN ai_membership_benefit_definition d ON d.benefit_code = benefit_values.benefit_code
ON DUPLICATE KEY UPDATE
  benefit_value = VALUES(benefit_value),
  enabled = VALUES(enabled),
  update_time = CURRENT_TIMESTAMP;
-- 将旧版仍有效的会员记录迁移为专业版订阅。旧套餐没有自动续费协议，
-- 因此 sku_id 留空、auto_renew 设为 0，后续由权益周期服务懒初始化当期额度。
INSERT IGNORE INTO ai_user_subscription (
  tenant_id, user_id, plan_id, sku_id, status, auto_renew,
  start_time, current_period_start, current_period_end,
  benefit_anchor_time, next_renew_time, cancel_at_period_end,
  plan_snapshot_json, source_order_no
)
SELECT
  legacy.tenant_id,
  legacy.user_id,
  target_plan.id,
  NULL,
  'active',
  0,
  legacy.start_time,
  legacy.start_time,
  legacy.expire_time,
  legacy.start_time,
  NULL,
  1,
  legacy.plan_snapshot_json,
  legacy.source_order_no
FROM (
  SELECT
    membership.*,
    ROW_NUMBER() OVER (
      PARTITION BY membership.user_id
      ORDER BY membership.expire_time DESC, membership.id DESC
    ) AS row_no
  FROM ai_user_membership membership
  JOIN ai_membership_plan legacy_plan ON legacy_plan.id = membership.plan_id
  WHERE membership.status = 'active'
    AND membership.expire_time > CURRENT_TIMESTAMP
    AND legacy_plan.plan_code IN ('pro_month', 'pro_quarter', 'pro_year')
) legacy
JOIN ai_membership_plan target_plan ON target_plan.plan_code = 'pro'
WHERE legacy.row_no = 1;