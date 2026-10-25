CREATE TABLE IF NOT EXISTS ai_market_viral_favorite (
  id BIGINT NOT NULL COMMENT '主键ID，由MyBatis-Plus雪花算法生成',
  tenant_id INT NOT NULL COMMENT '租户ID',
  user_id INT NOT NULL COMMENT '用户ID',
  video_id BIGINT NOT NULL COMMENT '市场爆款链接ID',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_market_viral_favorite (tenant_id, user_id, video_id),
  KEY idx_ai_market_viral_favorite_user (tenant_id, user_id, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='市场品类爆款用户收藏';
