CREATE TABLE IF NOT EXISTS sys_market_function (
  id BIGINT NOT NULL COMMENT '主键ID，由MyBatis-Plus雪花算法生成',
  code VARCHAR(80) NOT NULL COMMENT '功能唯一编码',
  title VARCHAR(120) NOT NULL COMMENT '功能名称',
  summary VARCHAR(500) NOT NULL COMMENT '市场卡片简介',
  description TEXT DEFAULT NULL COMMENT '功能详情说明',
  badge VARCHAR(40) DEFAULT NULL COMMENT '市场角标',
  icon VARCHAR(60) NOT NULL DEFAULT 'sparkles' COMMENT '前端图标标识',
  cover_url VARCHAR(2000) DEFAULT NULL COMMENT '市场卡片封面',
  feature_type VARCHAR(24) NOT NULL DEFAULT 'builtin' COMMENT 'builtin/external',
  route VARCHAR(1000) NOT NULL COMMENT '站内路由或外链',
  category VARCHAR(60) DEFAULT NULL COMMENT '功能分类',
  tags_json JSON DEFAULT NULL COMMENT '展示标签',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序，越小越靠前',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0草稿 1上架',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_market_function_code (code),
  KEY idx_sys_market_function_published (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='市场功能上架配置表';

INSERT INTO sys_market_function (
  id, code, title, summary, description, badge, icon, feature_type, route,
  category, tags_json, sort_order, status, create_time, update_time, deleted
)
SELECT
  900000000000000001,
  'category-viral-links',
  '品类爆款链接',
  '按品类聚合抖音、小红书全时长的单品测评爆款链接。',
  '输入品类后自动采集候选视频，剔除多品横测、榜单和跨品类推荐，并按点赞数从高到低展示。',
  'HOT',
  'flame',
  'builtin',
  '/market/category-viral-links',
  '内容灵感',
  JSON_ARRAY('爆款链接', '品类测评', '短视频'),
  10,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM sys_market_function WHERE code = 'category-viral-links'
);
