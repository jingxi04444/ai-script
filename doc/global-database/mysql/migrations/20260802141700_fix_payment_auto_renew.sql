-- 修复自动续费协议关联、有效协议唯一约束和回调幂等。
ALTER TABLE `ai_user_pay_contract`
  ADD COLUMN `initial_order_no` VARCHAR(80) DEFAULT NULL COMMENT '签约后发起首期扣款的本地订单号' AFTER `subscription_id`;

ALTER TABLE `ai_user_pay_contract`
  DROP INDEX `uk_user_channel_signed`;

-- 已存在生效协议时，历史待签约记录不再占用有效协议槽。
UPDATE `ai_user_pay_contract` pending
JOIN `ai_user_pay_contract` signed
  ON signed.user_id = pending.user_id
 AND signed.channel = pending.channel
 AND signed.status = 'signed'
 AND signed.deleted = 0
SET pending.status = 'expired'
WHERE pending.status = 'pending'
  AND pending.deleted = 0;

ALTER TABLE `ai_user_pay_contract`
  ADD COLUMN `active_slot` TINYINT GENERATED ALWAYS AS (
    CASE WHEN `status` IN ('pending', 'signed') AND `deleted` = 0 THEN 1 ELSE NULL END
  ) STORED COMMENT '待签约或生效协议唯一槽' AFTER `status`,
  ADD UNIQUE KEY `uk_user_channel_active` (`user_id`, `channel`, `active_slot`),
  ADD UNIQUE KEY `uk_contract_initial_order` (`initial_order_no`);

-- 老数据中微信通知ID可能为空；后续应用会从通知信封的 id 字段写入该列。
ALTER TABLE `ai_payment_callback`
  MODIFY COLUMN `notify_id` VARCHAR(120) DEFAULT NULL COMMENT '渠道通知唯一ID/主动查单幂等ID';
