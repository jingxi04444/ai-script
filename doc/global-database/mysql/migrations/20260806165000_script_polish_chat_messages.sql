CREATE TABLE IF NOT EXISTS ai_script_polish_message (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  tenant_id INT NOT NULL COMMENT '租户ID',
  script_id INT NOT NULL COMMENT '脚本ID',
  user_id INT NOT NULL COMMENT '发起润色的用户ID',
  reply_to_id INT DEFAULT NULL COMMENT '回复的用户消息ID',
  role VARCHAR(20) NOT NULL COMMENT '消息角色：user/assistant',
  status VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT '状态：pending/success/failed',
  content LONGTEXT NOT NULL COMMENT '消息正文',
  context_snapshot JSON DEFAULT NULL COMMENT '本次润色完整上下文快照',
  error_message TEXT DEFAULT NULL COMMENT '失败原因',
  create_by INT DEFAULT NULL COMMENT '创建人',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_by INT DEFAULT NULL COMMENT '更新人',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  KEY idx_ai_script_polish_message_script (tenant_id, script_id, id),
  KEY idx_ai_script_polish_message_user (tenant_id, user_id, create_time),
  KEY idx_ai_script_polish_message_reply (reply_to_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本AI润色聊天消息';

-- 将旧版本快照中可恢复的润色对话迁入聊天表，确保升级前的成功记录仍可查看。
INSERT INTO ai_script_polish_message (
  tenant_id, script_id, user_id, reply_to_id, role, status, content,
  context_snapshot, error_message, create_by, create_time, update_time, deleted
)
SELECT
  history.tenant_id,
  history.script_id,
  history.user_id,
  NULL,
  history.role,
  'success',
  history.content,
  JSON_OBJECT('legacyVersionId', history.version_id, 'migratedFrom', 'ai_script_version'),
  NULL,
  history.user_id,
  history.create_time,
  history.create_time,
  0
FROM (
  SELECT
    version.tenant_id,
    version.script_id,
    COALESCE(version.create_by, script.create_by, 0) AS user_id,
    version.id AS version_id,
    version.version_no,
    version.create_time,
    1 AS role_order,
    'user' AS role,
    JSON_UNQUOTE(JSON_EXTRACT(version.content_snapshot, '$.instruction')) AS content
  FROM ai_script_version version
  JOIN ai_storyboard_script script ON script.id = version.script_id
  WHERE NULLIF(JSON_UNQUOTE(JSON_EXTRACT(version.content_snapshot, '$.instruction')), '') IS NOT NULL

  UNION ALL

  SELECT
    version.tenant_id,
    version.script_id,
    COALESCE(version.create_by, script.create_by, 0) AS user_id,
    version.id AS version_id,
    version.version_no,
    version.create_time,
    2 AS role_order,
    'assistant' AS role,
    COALESCE(
      NULLIF(JSON_UNQUOTE(JSON_EXTRACT(version.content_snapshot, '$.summary')), ''),
      CONCAT('已完成第 V', version.version_no, ' 版润色。')
    ) AS content
  FROM ai_script_version version
  JOIN ai_storyboard_script script ON script.id = version.script_id
  WHERE NULLIF(JSON_UNQUOTE(JSON_EXTRACT(version.content_snapshot, '$.instruction')), '') IS NOT NULL
) history
ORDER BY history.script_id, history.version_no, history.role_order;
