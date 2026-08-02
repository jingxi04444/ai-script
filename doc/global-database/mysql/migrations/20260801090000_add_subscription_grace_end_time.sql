ALTER TABLE ai_user_subscription
    ADD COLUMN grace_end_time DATETIME NULL COMMENT '自动续费失败后的宽限期结束时间' AFTER next_renew_time;
