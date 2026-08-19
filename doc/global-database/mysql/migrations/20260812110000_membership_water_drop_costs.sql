-- 铼河水滴消耗规则：补齐脚本生成/润色费用，并统一五类消耗的用户文案与套餐示例值。
-- MySQL 8.0，可重复执行。

SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO ai_membership_benefit_definition (
  benefit_code, benefit_name, category, value_type, unit,
  reset_type, preview_only, enabled, description, display_order
) VALUES
  ('BRIEF_DETECT_POINT_COST', 'Brief检测水滴消耗', 'brief', 'integer', '💧/次', 'none', 0, 1, '每次执行 Brief 智能检测消耗的铼河水滴', 22),
  ('VIRAL_SIMPLE_POINT_COST', '爆款简易解析水滴消耗', 'viral', 'integer', '💧/次', 'none', 0, 1, '每次确认生成简易文案分析消耗的铼河水滴', 41),
  ('VIRAL_DEEP_POINT_COST', '爆款深度解析水滴消耗', 'viral', 'integer', '💧/次', 'none', 0, 1, '每次确认生成深度拉片拆解消耗的铼河水滴', 44),
  ('SCRIPT_GENERATE_POINT_COST', '脚本生成水滴消耗', 'script', 'integer', '💧/次', 'none', 0, 1, '每次提交生成脚本消耗的铼河水滴', 11),
  ('SCRIPT_POLISH_POINT_COST', '脚本润色水滴消耗', 'script', 'integer', '💧/次', 'none', 0, 1, '每次发送修改要求消耗的铼河水滴', 12)
ON DUPLICATE KEY UPDATE
  benefit_name = VALUES(benefit_name),
  category = VALUES(category),
  value_type = VALUES(value_type),
  unit = VALUES(unit),
  reset_type = VALUES(reset_type),
  preview_only = VALUES(preview_only),
  enabled = VALUES(enabled),
  description = VALUES(description),
  display_order = VALUES(display_order),
  deleted = 0,
  update_time = CURRENT_TIMESTAMP;

-- 旧版数据库中这些权益编码仍使用“积分”文案；仅统一展示名称和单位，
-- 不改变任何套餐的权益数值或用户水滴余额。
UPDATE ai_membership_benefit_definition
SET benefit_name = CASE benefit_code
      WHEN 'POINT_PURCHASE_ACCESS' THEN '水滴购买权限'
      WHEN 'POINTS_PER_10_YUAN' THEN '每10元购买水滴数'
      WHEN 'DAILY_LOGIN_POINT' THEN '每日登录水滴奖励'
      WHEN 'VIDEO_LAUNCH_BONUS_POINT' THEN '视频功能上线赠送水滴'
      ELSE benefit_name
    END,
    unit = CASE
      WHEN benefit_code IN (
        'POINTS_PER_10_YUAN',
        'DAILY_LOGIN_POINT',
        'VIDEO_LAUNCH_BONUS_POINT'
      ) THEN '💧'
      ELSE unit
    END,
    update_time = CURRENT_TIMESTAMP
WHERE benefit_code IN (
  'POINT_PURCHASE_ACCESS',
  'POINTS_PER_10_YUAN',
  'DAILY_LOGIN_POINT',
  'VIDEO_LAUNCH_BONUS_POINT'
)
  AND deleted = 0;

-- 标准水滴包只替换遗留的“积分”字样，保留后台自定义名称、价格和数量。
UPDATE ai_point_package
SET package_name = IF(package_name LIKE '%积分%', REPLACE(package_name, '积分', '水滴'), package_name),
    description = IF(description LIKE '%积分%', REPLACE(description, '积分', '水滴'), description),
    update_time = CURRENT_TIMESTAMP
WHERE package_code IN ('points_500', 'points_2500', 'points_5000', 'points_15000')
  AND (package_name LIKE '%积分%' OR description LIKE '%积分%');

INSERT INTO ai_membership_plan_benefit (
  plan_id, benefit_id, benefit_value, enabled
)
SELECT p.id, d.id, costs.benefit_value, 1
FROM JSON_TABLE(
  '[
    {"plan":"free","code":"BRIEF_DETECT_POINT_COST","value":"40"},
    {"plan":"free","code":"VIRAL_SIMPLE_POINT_COST","value":"40"},
    {"plan":"free","code":"VIRAL_DEEP_POINT_COST","value":"80"},
    {"plan":"free","code":"SCRIPT_GENERATE_POINT_COST","value":"50"},
    {"plan":"free","code":"SCRIPT_POLISH_POINT_COST","value":"20"},

    {"plan":"light","code":"BRIEF_DETECT_POINT_COST","value":"30"},
    {"plan":"light","code":"VIRAL_SIMPLE_POINT_COST","value":"30"},
    {"plan":"light","code":"VIRAL_DEEP_POINT_COST","value":"60"},
    {"plan":"light","code":"SCRIPT_GENERATE_POINT_COST","value":"40"},
    {"plan":"light","code":"SCRIPT_POLISH_POINT_COST","value":"15"},

    {"plan":"pro","code":"BRIEF_DETECT_POINT_COST","value":"25"},
    {"plan":"pro","code":"VIRAL_SIMPLE_POINT_COST","value":"25"},
    {"plan":"pro","code":"VIRAL_DEEP_POINT_COST","value":"50"},
    {"plan":"pro","code":"SCRIPT_GENERATE_POINT_COST","value":"30"},
    {"plan":"pro","code":"SCRIPT_POLISH_POINT_COST","value":"10"},

    {"plan":"ultimate","code":"BRIEF_DETECT_POINT_COST","value":"20"},
    {"plan":"ultimate","code":"VIRAL_SIMPLE_POINT_COST","value":"20"},
    {"plan":"ultimate","code":"VIRAL_DEEP_POINT_COST","value":"40"},
    {"plan":"ultimate","code":"SCRIPT_GENERATE_POINT_COST","value":"20"},
    {"plan":"ultimate","code":"SCRIPT_POLISH_POINT_COST","value":"5"}
  ]',
  '$[*]' COLUMNS (
    plan_code VARCHAR(40) PATH '$.plan',
    benefit_code VARCHAR(80) PATH '$.code',
    benefit_value VARCHAR(500) PATH '$.value'
  )
) costs
JOIN ai_membership_plan p
  ON p.plan_code = costs.plan_code
 AND p.deleted = 0
JOIN ai_membership_benefit_definition d
  ON d.benefit_code = costs.benefit_code
 AND d.deleted = 0
WHERE TRUE
ON DUPLICATE KEY UPDATE
  -- 迁移可重复执行，但不得覆盖管理员上线后已调整的价格。
  benefit_value = IF(
    ai_membership_plan_benefit.deleted = 1,
    VALUES(benefit_value),
    ai_membership_plan_benefit.benefit_value
  ),
  enabled = IF(
    ai_membership_plan_benefit.deleted = 1,
    1,
    ai_membership_plan_benefit.enabled
  ),
  deleted = 0;

-- 为迁移前已经存在的自定义套餐补齐五项水滴费用。保守默认值与免费版一致；
-- 已存在的有效配置（包括后台改过的价格和启停状态）保持原样。
INSERT INTO ai_membership_plan_benefit (
  plan_id, benefit_id, benefit_value, enabled
)
SELECT
  p.id,
  d.id,
  CASE d.benefit_code
    WHEN 'BRIEF_DETECT_POINT_COST' THEN '40'
    WHEN 'VIRAL_SIMPLE_POINT_COST' THEN '40'
    WHEN 'VIRAL_DEEP_POINT_COST' THEN '80'
    WHEN 'SCRIPT_GENERATE_POINT_COST' THEN '50'
    WHEN 'SCRIPT_POLISH_POINT_COST' THEN '20'
  END,
  1
FROM ai_membership_plan p
JOIN ai_membership_benefit_definition d
  ON d.benefit_code IN (
    'BRIEF_DETECT_POINT_COST',
    'VIRAL_SIMPLE_POINT_COST',
    'VIRAL_DEEP_POINT_COST',
    'SCRIPT_GENERATE_POINT_COST',
    'SCRIPT_POLISH_POINT_COST'
  )
 AND d.deleted = 0
WHERE p.deleted = 0
  AND p.plan_code NOT IN ('free', 'light', 'pro', 'ultimate')
ON DUPLICATE KEY UPDATE
  benefit_value = IF(
    ai_membership_plan_benefit.deleted = 1,
    VALUES(benefit_value),
    ai_membership_plan_benefit.benefit_value
  ),
  enabled = IF(
    ai_membership_plan_benefit.deleted = 1,
    1,
    ai_membership_plan_benefit.enabled
  ),
  deleted = 0;

COMMIT;
