-- 脚本审核状态统一为：草稿中 / 待审核 / 已审需修改 / 已改待审核 / 通过
-- 兼容迁移历史的 pending、done 状态；字段本身为 VARCHAR(32)，无需修改表结构。
UPDATE ai_storyboard_script
SET status = CASE
  WHEN status = 'pending' THEN 'pending_review'
  WHEN status = 'done' THEN 'approved'
  ELSE status
END
WHERE deleted = 0
  AND status IN ('pending', 'done');
