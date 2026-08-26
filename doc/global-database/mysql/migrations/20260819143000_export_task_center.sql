ALTER TABLE ai_export_job
  ADD COLUMN storage_key VARCHAR(500) DEFAULT NULL COMMENT '导出产物存储Key' AFTER asset_id,
  ADD COLUMN source_count INT NOT NULL DEFAULT 0 COMMENT '包含的源内容数量' AFTER status,
  ADD COLUMN progress INT NOT NULL DEFAULT 0 COMMENT '处理进度0-100' AFTER source_count,
  ADD COLUMN file_size BIGINT DEFAULT NULL COMMENT '导出文件字节数' AFTER progress,
  ADD COLUMN error_message TEXT DEFAULT NULL COMMENT '失败原因' AFTER file_size,
  ADD COLUMN finish_time DATETIME DEFAULT NULL COMMENT '完成时间' AFTER error_message,
  ADD COLUMN expire_at DATETIME DEFAULT NULL COMMENT '下载过期时间' AFTER finish_time,
  ADD COLUMN update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间' AFTER create_time,
  ADD KEY idx_ai_export_job_owner_status (tenant_id, create_by, status, create_time);
