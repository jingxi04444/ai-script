-- 脚本分享链接改为飞书式「开关分享」：只有未开启 / 互联网获得链接的人可评论两种状态，不设有效期。
-- 1) 增加明文分享令牌，便于再次打开分享面板时展示与复制同一条链接；
-- 2) status 增加 disabled 状态；expires_at 保留为历史字段，不再参与校验。
-- 执行库：ai_script

ALTER TABLE ai_script_review_link
  ADD COLUMN share_token VARCHAR(64) DEFAULT NULL COMMENT '分享令牌明文，用于再次展示与复制链接' AFTER script_id,
  MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态：active/disabled/revoked',
  MODIFY COLUMN expires_at DATETIME DEFAULT NULL COMMENT '过期时间（历史字段，链接分享已不设有效期）';

-- 存量记录没有明文令牌，首次打开分享面板时会自动补发一次新链接，旧链接随之失效。
