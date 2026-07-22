-- Real payment migration. MySQL 8.0 supports ADD COLUMN IF NOT EXISTS.
-- Some MySQL versions do not support ADD INDEX IF NOT EXISTS; index statements below are plain ALTER and may be executed manually after checking existence.

ALTER TABLE ai_payment_order
  ADD COLUMN IF NOT EXISTS provider VARCHAR(40) DEFAULT NULL COMMENT '支付渠道' AFTER pay_method,
  ADD COLUMN IF NOT EXISTS trade_type VARCHAR(40) DEFAULT NULL COMMENT '交易类型' AFTER provider,
  ADD COLUMN IF NOT EXISTS plan_id INT DEFAULT NULL COMMENT '会员套餐ID' AFTER trade_type,
  ADD COLUMN IF NOT EXISTS product_snapshot_json JSON DEFAULT NULL COMMENT '商品快照' AFTER plan_id,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(12) NOT NULL DEFAULT 'CNY' COMMENT '币种' AFTER product_snapshot_json,
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(14,2) DEFAULT NULL COMMENT '实付金额' AFTER amount,
  ADD COLUMN IF NOT EXISTS provider_status VARCHAR(64) DEFAULT NULL COMMENT '三方状态' AFTER status,
  ADD COLUMN IF NOT EXISTS qr_content VARCHAR(1000) DEFAULT NULL COMMENT '二维码内容' AFTER provider_trade_no,
  ADD COLUMN IF NOT EXISTS expire_time DATETIME DEFAULT NULL COMMENT '过期时间' AFTER pay_time,
  ADD COLUMN IF NOT EXISTS notify_time DATETIME DEFAULT NULL COMMENT '通知时间' AFTER expire_time,
  ADD COLUMN IF NOT EXISTS last_query_time DATETIME DEFAULT NULL COMMENT '最后查询时间' AFTER notify_time,
  ADD COLUMN IF NOT EXISTS fulfill_status VARCHAR(32) DEFAULT NULL COMMENT '履约状态' AFTER last_query_time,
  ADD COLUMN IF NOT EXISTS fulfill_time DATETIME DEFAULT NULL COMMENT '履约时间' AFTER fulfill_status,
  ADD COLUMN IF NOT EXISTS fulfill_error VARCHAR(1000) DEFAULT NULL COMMENT '履约错误' AFTER fulfill_time,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本' AFTER close_time;

ALTER TABLE ai_payment_callback
  ADD COLUMN IF NOT EXISTS notify_id VARCHAR(120) DEFAULT NULL COMMENT '通知ID' AFTER order_no,
  ADD COLUMN IF NOT EXISTS provider_trade_no VARCHAR(120) DEFAULT NULL COMMENT '三方交易号' AFTER notify_id,
  ADD COLUMN IF NOT EXISTS trade_status VARCHAR(64) DEFAULT NULL COMMENT '交易状态' AFTER provider_trade_no,
  ADD COLUMN IF NOT EXISTS total_amount DECIMAL(14,2) DEFAULT NULL COMMENT '通知金额' AFTER trade_status,
  ADD COLUMN IF NOT EXISTS headers_json JSON DEFAULT NULL COMMENT '请求头' AFTER total_amount,
  ADD COLUMN IF NOT EXISTS raw_body MEDIUMTEXT DEFAULT NULL COMMENT '原始请求体' AFTER headers_json,
  ADD COLUMN IF NOT EXISTS signature VARCHAR(1000) DEFAULT NULL COMMENT '签名' AFTER raw_body,
  ADD COLUMN IF NOT EXISTS verified TINYINT DEFAULT 0 COMMENT '是否验签通过' AFTER signature,
  ADD COLUMN IF NOT EXISTS error_msg VARCHAR(1000) DEFAULT NULL COMMENT '错误信息' AFTER verified,
  ADD COLUMN IF NOT EXISTS received_time DATETIME DEFAULT NULL COMMENT '接收时间' AFTER error_msg;

ALTER TABLE ai_wallet_account ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本' AFTER frozen_balance;
ALTER TABLE ai_wallet_transaction ADD COLUMN IF NOT EXISTS order_no VARCHAR(80) DEFAULT NULL COMMENT '支付订单号' AFTER biz_id, ADD COLUMN IF NOT EXISTS request_no VARCHAR(100) DEFAULT NULL COMMENT '幂等请求号' AFTER order_no;
ALTER TABLE ai_user_membership ADD COLUMN IF NOT EXISTS source_order_no VARCHAR(80) DEFAULT NULL COMMENT '来源支付订单号' AFTER status, ADD COLUMN IF NOT EXISTS source_pay_method VARCHAR(40) DEFAULT NULL COMMENT '来源支付方式' AFTER source_order_no, ADD COLUMN IF NOT EXISTS plan_snapshot_json JSON DEFAULT NULL COMMENT '套餐快照' AFTER source_pay_method;

-- Required unique indexes (check existence before executing on versions without IF NOT EXISTS):
-- ALTER TABLE ai_payment_order ADD INDEX idx_ai_payment_order_provider_trade (provider, provider_trade_no);
ALTER TABLE ai_payment_order ADD UNIQUE KEY uk_ai_payment_order_provider_trade (provider, provider_trade_no);
-- ALTER TABLE ai_payment_order ADD INDEX idx_ai_payment_order_status_expire (status, expire_time);
-- ALTER TABLE ai_payment_callback ADD INDEX idx_ai_payment_callback_notify (provider, notify_id);
ALTER TABLE ai_payment_callback ADD UNIQUE KEY uk_ai_payment_callback_notify (provider, notify_id);
ALTER TABLE ai_wallet_transaction ADD UNIQUE KEY uk_ai_wallet_tx_order_type (order_no, transaction_type);
ALTER TABLE ai_user_membership ADD UNIQUE KEY uk_ai_user_membership_source_order (source_order_no);
