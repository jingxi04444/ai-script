USE ai_script;

CREATE TABLE IF NOT EXISTS sys_config_item (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  parent_id INT DEFAULT NULL COMMENT '父节点ID，空表示根节点',
  node_type VARCHAR(16) NOT NULL DEFAULT 'item' COMMENT '节点类型：group分组/item配置项',
  group_code VARCHAR(80) NOT NULL COMMENT '所属配置模块编码',
  config_key VARCHAR(160) NOT NULL COMMENT '全局唯一配置键，使用点分层级命名',
  config_name VARCHAR(120) NOT NULL COMMENT '配置项显示名称',
  config_value LONGTEXT DEFAULT NULL COMMENT '配置值',
  value_type VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '值类型：string/text/number/boolean/json/image',
  description VARCHAR(500) DEFAULT NULL COMMENT '配置说明',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '同级排序',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_config_item_key (config_key),
  KEY idx_sys_config_item_parent_sort (parent_id, sort_order),
  KEY idx_sys_config_item_group_status (group_code, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='树形字典配置项';

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value, value_type, description, sort_order, status
) VALUES
  (NULL, 'group', 'page-visual', 'visual', '页面视觉', NULL, 'string', '用户端页面图标、图片和文案配置', 10, 1),
  (NULL, 'group', 'script-generator', 'content', '脚本生成器', NULL, 'string', '脚本生成器案例与提示词配置', 20, 1)
ON DUPLICATE KEY UPDATE
  config_name = VALUES(config_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

SET @visual_root_id = (SELECT id FROM sys_config_item WHERE config_key = 'visual' LIMIT 1);
SET @content_root_id = (SELECT id FROM sys_config_item WHERE config_key = 'content' LIMIT 1);

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value, value_type, description, sort_order, status
) VALUES
  (@visual_root_id, 'group', 'page-visual', 'visual.home', '主页视觉', NULL, 'string', '主页品牌、导航、快捷入口和作品配置', 10, 1),
  (@visual_root_id, 'group', 'page-visual', 'visual.script-generator', '脚本生成器视觉', NULL, 'string', '脚本生成器品牌区和入口配置', 20, 1),
  (@content_root_id, 'group', 'script-generator', 'content.viral', '爆款复刻管理', NULL, 'string', '爆款解析案例配置', 10, 1),
  (@content_root_id, 'group', 'script-generator', 'content.original', 'AI智能脚本管理', NULL, 'string', 'AI智能脚本分类提示词配置', 20, 1)
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  config_name = VALUES(config_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);

SET @visual_home_id = (SELECT id FROM sys_config_item WHERE config_key = 'visual.home' LIMIT 1);
SET @visual_script_id = (SELECT id FROM sys_config_item WHERE config_key = 'visual.script-generator' LIMIT 1);
SET @content_viral_id = (SELECT id FROM sys_config_item WHERE config_key = 'content.viral' LIMIT 1);
SET @content_original_id = (SELECT id FROM sys_config_item WHERE config_key = 'content.original' LIMIT 1);

INSERT INTO sys_config_item (
  parent_id, node_type, group_code, config_key, config_name, config_value, value_type, description, sort_order, status
)
SELECT @visual_home_id, 'item', 'page-visual', 'site.home.logo.url', '首页品牌图标 URL',
       front_home_logo_url, 'string', '用户端左侧栏顶部品牌图标地址', 10, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @visual_home_id, 'item', 'page-visual', 'site.home.logo.key', '首页品牌图标存储 Key',
       front_home_logo_key, 'string', '品牌图标对象存储 Key', 20, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @visual_home_id, 'item', 'page-visual', 'visual.home.config', '主页视觉配置',
       CAST(front_home_visual_config AS CHAR), 'json', '主页导航、快捷入口和作品配置', 30, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @visual_script_id, 'item', 'page-visual', 'visual.script-generator.config', '脚本生成器视觉配置',
       CAST(front_script_visual_config AS CHAR), 'json', '脚本生成器图标与文案配置', 10, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @content_viral_id, 'item', 'script-generator', 'content.viral.simple-analysis-example', '简易文案解析案例',
       front_viral_simple_analysis_example, 'text', '爆款复刻简易文案解析示例', 10, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @content_viral_id, 'item', 'script-generator', 'content.viral.deep-analysis-example', '深度拉片解析案例',
       front_viral_deep_analysis_example, 'text', '爆款复刻深度拉片解析示例', 20, 1
FROM sys_site_config WHERE config_code = 'default'
UNION ALL
SELECT @content_original_id, 'item', 'script-generator', 'content.original.scenario-prompts', 'AI智能脚本分类提示词',
       CAST(front_original_scenario_prompts AS CHAR), 'json', 'AI智能脚本大类和子类提示词配置', 10, 1
FROM sys_site_config WHERE config_code = 'default'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  config_name = VALUES(config_name),
  config_value = COALESCE(VALUES(config_value), config_value),
  value_type = VALUES(value_type),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  status = VALUES(status);
