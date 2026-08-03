-- 会员中心购买方式 Tab 动态配置
-- 执行时间：2026-08-03 14:30:00

USE ai_script;
SET NAMES utf8mb4;

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value,
  value_type, description, sort_order, status
) VALUES (
  NULL, 'group', 'membership', 'membership', '会员中心', NULL,
  'string', '会员购买方式和展示配置', 40, 1
) ON DUPLICATE KEY UPDATE
  config_name = VALUES(config_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

SET @membership_root_id = (SELECT id FROM sys_config_item WHERE config_key = 'membership' LIMIT 1);

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value,
  value_type, description, sort_order, status
) VALUES (
  @membership_root_id, 'item', 'membership', 'membership.purchase-modes', '会员购买方式 Tab 配置',
  '[{"value":"once_month","label":"单月购买","hint":"购买一个月","badge":"","enabled":true,"displayOrder":10},{"value":"auto_month","label":"连续包月","hint":"每月自动续费","badge":"","enabled":true,"displayOrder":20},{"value":"auto_quarter","label":"连续包季","hint":"每季自动续费","badge":"","enabled":true,"displayOrder":30},{"value":"auto_year","label":"连续包年","hint":"每年自动续费","badge":"限时优惠","enabled":true,"displayOrder":40}]',
  'json', '控制会员中心购买方式 Tab 的文案、角标、显隐和顺序', 10, 1
) ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  config_name = VALUES(config_name),
  value_type = VALUES(value_type),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);
