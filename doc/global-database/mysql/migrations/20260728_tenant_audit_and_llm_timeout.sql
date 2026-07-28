-- 补齐租户表的公共审计字段，保持与 BaseEntity 映射一致。
ALTER TABLE sys_tenant
  ADD COLUMN create_by INT DEFAULT NULL COMMENT '创建人' AFTER expire_time,
  ADD COLUMN update_by INT DEFAULT NULL COMMENT '更新人' AFTER create_time;

-- 已有 LLM Provider 沿用原配置时，将过短的超时统一提升到 180 秒。
UPDATE sys_api_provider_config
SET timeout_ms = 180000
WHERE provider_type = 'llm'
  AND timeout_ms < 180000;