USE ai_script;

-- 会员等级表保留旧价格字段用于迁移期兼容，新增等级展示字段。
ALTER TABLE ai_membership_plan
  ADD COLUMN plan_level INT NOT NULL DEFAULT 0 COMMENT '会员等级排序' AFTER plan_name,
  ADD COLUMN is_free TINYINT NOT NULL DEFAULT 0 COMMENT '是否免费套餐' AFTER plan_level,
  ADD COLUMN description VARCHAR(500) DEFAULT NULL COMMENT '套餐说明' AFTER benefits_json,
  ADD COLUMN display_order INT NOT NULL DEFAULT 0 COMMENT '展示顺序' AFTER description;

CREATE TABLE IF NOT EXISTS ai_membership_plan_sku (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  plan_id BIGINT NOT NULL COMMENT '会员套餐ID',
  sku_code VARCHAR(80) NOT NULL COMMENT 'SKU编码',
  sku_name VARCHAR(120) NOT NULL COMMENT 'SKU名称',
  billing_mode VARCHAR(20) NOT NULL COMMENT '购买方式：one_time/auto_renew',
  period_unit VARCHAR(20) NOT NULL COMMENT '周期单位：month/quarter/year',
  period_count INT NOT NULL DEFAULT 1 COMMENT '周期数量',
  price DECIMAL(14,2) NOT NULL COMMENT '售价',
  original_price DECIMAL(14,2) DEFAULT NULL COMMENT '原价',
  refund_days INT NOT NULL DEFAULT 0 COMMENT '可退款天数',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  display_order INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  create_by BIGINT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by BIGINT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership_sku_code (sku_code),
  KEY idx_membership_sku_plan_status (plan_id, status, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员套餐销售SKU';

CREATE TABLE IF NOT EXISTS ai_membership_benefit_definition (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  benefit_code VARCHAR(80) NOT NULL COMMENT '权益编码',
  benefit_name VARCHAR(120) NOT NULL COMMENT '权益名称',
  category VARCHAR(40) NOT NULL COMMENT '所属模块',
  value_type VARCHAR(20) NOT NULL COMMENT '值类型',
  unit VARCHAR(30) DEFAULT NULL COMMENT '单位',
  reset_type VARCHAR(30) NOT NULL DEFAULT 'none' COMMENT '重置方式',
  preview_only TINYINT NOT NULL DEFAULT 0 COMMENT '是否仅预告',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用校验',
  description VARCHAR(500) DEFAULT NULL COMMENT '说明',
  display_order INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership_benefit_code (benefit_code),
  KEY idx_membership_benefit_category (category, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员权益定义';

CREATE TABLE IF NOT EXISTS ai_membership_plan_benefit (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  plan_id BIGINT NOT NULL COMMENT '套餐ID',
  benefit_id BIGINT NOT NULL COMMENT '权益定义ID',
  benefit_value VARCHAR(500) NOT NULL COMMENT '权益值',
  enabled TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用',
  effective_time DATETIME DEFAULT NULL COMMENT '生效时间',
  expire_time DATETIME DEFAULT NULL COMMENT '失效时间',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership_plan_benefit (plan_id, benefit_id),
  KEY idx_membership_plan_benefit_active (plan_id, enabled, effective_time, expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='套餐权益配置';

CREATE TABLE IF NOT EXISTS ai_user_subscription (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  plan_id BIGINT NOT NULL COMMENT '当前套餐ID',
  sku_id BIGINT DEFAULT NULL COMMENT '当前SKU，免费订阅可为空',
  status VARCHAR(30) NOT NULL DEFAULT 'active' COMMENT '订阅状态',
  auto_renew TINYINT NOT NULL DEFAULT 0 COMMENT '是否自动续费',
  start_time DATETIME NOT NULL COMMENT '开通时间',
  current_period_start DATETIME NOT NULL COMMENT '当前付费周期开始',
  current_period_end DATETIME NOT NULL COMMENT '当前付费周期结束',
  benefit_anchor_time DATETIME NOT NULL COMMENT '月度权益重置锚点',
  next_renew_time DATETIME DEFAULT NULL COMMENT '下次续费时间',
  cancel_at_period_end TINYINT NOT NULL DEFAULT 0 COMMENT '是否到期取消',
  cancel_time DATETIME DEFAULT NULL COMMENT '取消续费时间',
  pending_plan_id BIGINT DEFAULT NULL COMMENT '待生效降级套餐',
  pending_sku_id BIGINT DEFAULT NULL COMMENT '待生效降级SKU',
  pending_effective_time DATETIME DEFAULT NULL COMMENT '降级生效时间',
  provider VARCHAR(30) DEFAULT NULL COMMENT '支付渠道',
  agreement_no VARCHAR(120) DEFAULT NULL COMMENT '自动扣款协议号',
  plan_snapshot_json JSON DEFAULT NULL COMMENT '套餐与权益快照',
  source_order_no VARCHAR(80) DEFAULT NULL COMMENT '来源订单号',
  version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  active_slot TINYINT GENERATED ALWAYS AS (
    CASE WHEN status IN ('active', 'canceling', 'past_due') THEN 1 ELSE NULL END
  ) STORED COMMENT '有效订阅唯一槽',
  create_by BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_by BIGINT DEFAULT NULL,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_subscription_active (user_id, active_slot),
  UNIQUE KEY uk_user_subscription_source_order (source_order_no),
  KEY idx_user_subscription_period (user_id, status, current_period_end),
  KEY idx_user_subscription_renew (status, auto_renew, next_renew_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户会员订阅';

CREATE TABLE IF NOT EXISTS ai_membership_benefit_cycle (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  subscription_id BIGINT NOT NULL COMMENT '订阅ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  plan_id BIGINT NOT NULL COMMENT '当期套餐ID',
  cycle_no INT NOT NULL COMMENT '权益周期序号',
  cycle_start DATETIME NOT NULL COMMENT '周期开始',
  cycle_end DATETIME NOT NULL COMMENT '周期结束',
  status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active/closed/refunded',
  benefit_snapshot_json JSON DEFAULT NULL COMMENT '当期权益快照',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_membership_subscription_cycle (subscription_id, cycle_start),
  KEY idx_membership_cycle_user_time (user_id, cycle_start, cycle_end),
  KEY idx_membership_cycle_expire (status, cycle_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员月度权益周期';

CREATE TABLE IF NOT EXISTS ai_user_benefit_usage (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  cycle_id BIGINT DEFAULT NULL COMMENT '月度权益周期ID，终身额度为空',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  benefit_code VARCHAR(80) NOT NULL COMMENT '权益编码',
  usage_scope VARCHAR(30) NOT NULL COMMENT 'membership_month/lifetime',
  scope_key VARCHAR(100) NOT NULL COMMENT '周期作用域唯一键',
  quota_total BIGINT NOT NULL DEFAULT 0 COMMENT '当期总额度，-1表示无限',
  used_amount BIGINT NOT NULL DEFAULT 0 COMMENT '已使用',
  reserved_amount BIGINT NOT NULL DEFAULT 0 COMMENT '任务预占',
  version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_benefit_scope (user_id, benefit_code, scope_key),
  KEY idx_benefit_usage_cycle (cycle_id, benefit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户周期权益使用量';

CREATE TABLE IF NOT EXISTS ai_benefit_usage_transaction (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  usage_id BIGINT NOT NULL COMMENT '权益使用量账户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  benefit_code VARCHAR(80) NOT NULL COMMENT '权益编码',
  request_no VARCHAR(100) NOT NULL COMMENT '幂等请求号',
  amount BIGINT NOT NULL COMMENT '占用数量',
  status VARCHAR(20) NOT NULL COMMENT 'reserved/confirmed/released',
  biz_type VARCHAR(60) DEFAULT NULL,
  biz_id BIGINT DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_benefit_usage_request (request_no),
  KEY idx_benefit_usage_tx_user (user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权益额度预占流水';

CREATE TABLE IF NOT EXISTS ai_storage_object (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Primary key',
  tenant_id BIGINT DEFAULT NULL COMMENT 'Tenant ID',
  user_id BIGINT NOT NULL COMMENT 'User ID',
  object_key VARCHAR(500) NOT NULL COMMENT 'Storage object key',
  request_no VARCHAR(100) NOT NULL COMMENT 'Quota reservation request number',
  size_bytes BIGINT NOT NULL COMMENT 'Object size in bytes',
  biz_type VARCHAR(60) DEFAULT NULL COMMENT 'Business type',
  biz_id BIGINT DEFAULT NULL COMMENT 'Business ID',
  status VARCHAR(20) NOT NULL COMMENT 'reserved/active/released',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_storage_object_key (tenant_id, user_id, object_key),
  UNIQUE KEY uk_storage_object_request (request_no),
  KEY idx_storage_object_user_status (user_id, status, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Membership storage accounting object';
CREATE TABLE IF NOT EXISTS ai_point_account (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  available_points BIGINT NOT NULL DEFAULT 0 COMMENT '可用积分',
  frozen_points BIGINT NOT NULL DEFAULT 0 COMMENT '冻结积分',
  version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_point_account_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户积分账户';

CREATE TABLE IF NOT EXISTS ai_point_transaction (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  account_id BIGINT NOT NULL COMMENT '积分账户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  transaction_type VARCHAR(30) NOT NULL COMMENT 'purchase/reward/consume/refund',
  change_points BIGINT NOT NULL COMMENT '积分变动',
  balance_after BIGINT NOT NULL COMMENT '变动后余额',
  biz_type VARCHAR(60) DEFAULT NULL COMMENT '业务类型',
  biz_id BIGINT DEFAULT NULL COMMENT '业务ID',
  request_no VARCHAR(100) NOT NULL COMMENT '幂等请求号',
  source_order_no VARCHAR(80) DEFAULT NULL COMMENT '来源订单号',
  remark VARCHAR(500) DEFAULT NULL COMMENT '说明',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_point_transaction_request (request_no),
  KEY idx_point_transaction_user (user_id, create_time),
  KEY idx_point_transaction_biz (biz_type, biz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户积分流水';

CREATE TABLE IF NOT EXISTS ai_daily_point_reward (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL COMMENT '租户ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  reward_date DATE NOT NULL COMMENT '奖励日期',
  plan_id BIGINT NOT NULL COMMENT '领取时套餐',
  reward_points BIGINT NOT NULL COMMENT '奖励积分',
  transaction_id BIGINT NOT NULL COMMENT '积分流水ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_daily_point_reward (user_id, reward_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每日登录积分奖励';

CREATE TABLE IF NOT EXISTS ai_subscription_change_record (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL,
  subscription_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  change_type VARCHAR(30) NOT NULL COMMENT 'upgrade/downgrade/renew/cancel/revoke_downgrade',
  before_plan_id BIGINT DEFAULT NULL,
  before_sku_id BIGINT DEFAULT NULL,
  after_plan_id BIGINT DEFAULT NULL,
  after_sku_id BIGINT DEFAULT NULL,
  original_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  credit_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payable_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  effective_type VARCHAR(20) NOT NULL COMMENT 'immediate/next_period',
  effective_time DATETIME DEFAULT NULL,
  source_order_no VARCHAR(80) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subscription_change_order (source_order_no),
  KEY idx_subscription_change_user (user_id, create_time),
  KEY idx_subscription_change_pending (status, effective_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员订阅变更记录';

CREATE TABLE IF NOT EXISTS ai_refund_order (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id BIGINT DEFAULT NULL,
  refund_no VARCHAR(80) NOT NULL COMMENT '退款单号',
  payment_order_id BIGINT NOT NULL COMMENT '原支付订单ID',
  subscription_id BIGINT DEFAULT NULL COMMENT '订阅ID',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  refund_amount DECIMAL(14,2) NOT NULL COMMENT '退款金额',
  refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
  provider VARCHAR(30) DEFAULT NULL,
  provider_refund_no VARCHAR(120) DEFAULT NULL,
  provider_status VARCHAR(30) DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  review_by BIGINT DEFAULT NULL,
  review_time DATETIME DEFAULT NULL,
  review_remark VARCHAR(500) DEFAULT NULL,
  requested_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_time DATETIME DEFAULT NULL,
  failure_reason VARCHAR(1000) DEFAULT NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_refund_order_no (refund_no),
  UNIQUE KEY uk_refund_payment_order (payment_order_id),
  KEY idx_refund_user_time (user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员退款单';

ALTER TABLE ai_payment_order
  ADD COLUMN sku_id BIGINT DEFAULT NULL COMMENT '会员SKU ID' AFTER plan_id,
  ADD COLUMN subscription_id BIGINT DEFAULT NULL COMMENT '订阅ID' AFTER sku_id,
  ADD COLUMN order_scene VARCHAR(30) DEFAULT NULL COMMENT '订单场景' AFTER order_type,
  ADD COLUMN idempotency_key VARCHAR(100) DEFAULT NULL COMMENT '下单幂等键' AFTER order_no,
  ADD COLUMN refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT '累计退款金额' AFTER paid_amount,
  ADD UNIQUE KEY uk_payment_order_idempotency (user_id, idempotency_key),
  ADD KEY idx_payment_order_subscription (subscription_id, create_time);
