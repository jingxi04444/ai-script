-- 修复旧版免费套餐遗留的 0 消耗值。
-- 0 的业务含义是“本次免费”，功能是否开放由 *_ACCESS / SCRIPT_MONTHLY_LIMIT 权益控制。

SET NAMES utf8mb4;

START TRANSACTION;

UPDATE ai_membership_plan_benefit binding
JOIN ai_membership_plan plan
  ON plan.id = binding.plan_id
 AND plan.plan_code = 'free'
 AND plan.deleted = 0
JOIN ai_membership_benefit_definition definition
  ON definition.id = binding.benefit_id
 AND definition.deleted = 0
SET binding.benefit_value = CASE definition.benefit_code
      WHEN 'BRIEF_DETECT_POINT_COST' THEN '40'
      WHEN 'VIRAL_SIMPLE_POINT_COST' THEN '40'
      WHEN 'VIRAL_DEEP_POINT_COST' THEN '80'
      WHEN 'SCRIPT_GENERATE_POINT_COST' THEN '50'
      WHEN 'SCRIPT_POLISH_POINT_COST' THEN '20'
    END,
    binding.enabled = 1,
    binding.update_time = CURRENT_TIMESTAMP
WHERE definition.benefit_code IN (
    'BRIEF_DETECT_POINT_COST',
    'VIRAL_SIMPLE_POINT_COST',
    'VIRAL_DEEP_POINT_COST',
    'SCRIPT_GENERATE_POINT_COST',
    'SCRIPT_POLISH_POINT_COST'
  )
  AND binding.deleted = 0
  AND (binding.benefit_value IS NULL OR binding.benefit_value = '' OR binding.benefit_value = '0');

COMMIT;
