-- 会员售卖调整为月卡、季卡、年卡单次购买，到期后由用户手动续费。
-- 执行时间：2026-08-03 16:25:00

USE ai_script;
SET NAMES utf8mb4;

-- 旧单月原价 SKU 与原连续包月 SKU 周期重复，保留优惠 SKU 作为新的月卡。
UPDATE ai_membership_plan_sku
SET status = 0,
    update_time = CURRENT_TIMESTAMP
WHERE sku_code IN ('light_once_month', 'pro_once_month', 'ultimate_once_month');

-- 原连续订阅 SKU 原地转换为单次购买，保留主键以免影响历史订单和订阅关联。
UPDATE ai_membership_plan_sku
SET billing_mode = 'one_time',
    sku_name = CASE sku_code
      WHEN 'light_auto_month' THEN '轻量版月卡'
      WHEN 'light_auto_quarter' THEN '轻量版季卡'
      WHEN 'light_auto_year' THEN '轻量版年卡'
      WHEN 'pro_auto_month' THEN '专业版月卡'
      WHEN 'pro_auto_quarter' THEN '专业版季卡'
      WHEN 'pro_auto_year' THEN '专业版年卡'
      WHEN 'ultimate_auto_month' THEN '至尊版月卡'
      WHEN 'ultimate_auto_quarter' THEN '至尊版季卡'
      WHEN 'ultimate_auto_year' THEN '至尊版年卡'
      ELSE sku_name
    END,
    sku_code = CASE sku_code
      WHEN 'light_auto_month' THEN 'light_month'
      WHEN 'light_auto_quarter' THEN 'light_quarter'
      WHEN 'light_auto_year' THEN 'light_year'
      WHEN 'pro_auto_month' THEN 'pro_month'
      WHEN 'pro_auto_quarter' THEN 'pro_quarter'
      WHEN 'pro_auto_year' THEN 'pro_year'
      WHEN 'ultimate_auto_month' THEN 'ultimate_month'
      WHEN 'ultimate_auto_quarter' THEN 'ultimate_quarter'
      WHEN 'ultimate_auto_year' THEN 'ultimate_year'
      ELSE sku_code
    END,
    update_time = CURRENT_TIMESTAMP
WHERE billing_mode = 'auto_renew'
   OR sku_code IN (
     'light_auto_month', 'light_auto_quarter', 'light_auto_year',
     'pro_auto_month', 'pro_auto_quarter', 'pro_auto_year',
     'ultimate_auto_month', 'ultimate_auto_quarter', 'ultimate_auto_year'
   );

-- 已有会员改为到期终止，不再进入自动扣费生命周期任务。
UPDATE ai_user_subscription
SET auto_renew = 0,
    next_renew_time = NULL,
    cancel_at_period_end = 0,
    update_time = CURRENT_TIMESTAMP
WHERE auto_renew <> 0 OR next_renew_time IS NOT NULL;

-- 用户端只保留三个可由管理后台改名、排序和隐藏的购买 Tab。
UPDATE sys_config_item
SET config_value = '[{"value":"once_month","label":"单月购买","hint":"购买一个月","badge":"","enabled":true,"displayOrder":10},{"value":"once_quarter","label":"季卡","hint":"购买一个季度","badge":"","enabled":true,"displayOrder":20},{"value":"once_year","label":"年卡","hint":"购买一年","badge":"限时优惠","enabled":true,"displayOrder":30}]',
    description = '控制会员中心月卡、季卡、年卡 Tab 的文案、角标、显隐和顺序',
    update_time = CURRENT_TIMESTAMP
WHERE config_key = 'membership.purchase-modes';
