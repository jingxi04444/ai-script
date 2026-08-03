-- 为站内消息补充业务标识，支持会员到期提醒幂等发送。
ALTER TABLE `sys_notification`
  ADD COLUMN `biz_type` VARCHAR(60) DEFAULT NULL COMMENT '业务类型，用于通知去重与跳转' AFTER `channel`,
  ADD COLUMN `biz_id` VARCHAR(180) DEFAULT NULL COMMENT '业务唯一标识' AFTER `biz_type`,
  ADD UNIQUE KEY `uk_sys_notification_biz` (`user_id`, `channel`, `biz_type`, `biz_id`);
