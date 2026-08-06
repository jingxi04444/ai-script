ALTER TABLE ai_storyboard_script
  ADD COLUMN generation_duration VARCHAR(40) DEFAULT NULL COMMENT '生成时选择的脚本时长' AFTER script_type,
  ADD COLUMN generation_format VARCHAR(80) DEFAULT NULL COMMENT '生成时选择的脚本格式编码' AFTER generation_duration,
  ADD COLUMN generation_format_name VARCHAR(120) DEFAULT NULL COMMENT '生成时脚本格式名称快照' AFTER generation_format;

-- 回填历史生成任务中已经保存的时长和格式，避免旧脚本重新打开后显示成页面默认值。
UPDATE ai_storyboard_script script
JOIN ai_generation_task task
  ON task.task_type = 'generate_script'
  AND JSON_UNQUOTE(JSON_EXTRACT(task.result_payload, '$.scriptId')) = CAST(script.id AS CHAR)
LEFT JOIN sys_script_format_config format_config
  ON format_config.code = JSON_UNQUOTE(JSON_EXTRACT(task.input_payload, '$.format'))
SET script.generation_duration = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(task.input_payload, '$.duration')), ''),
    script.generation_format = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(task.input_payload, '$.format')), ''),
    script.generation_format_name = COALESCE(
      format_config.name,
      NULLIF(JSON_UNQUOTE(JSON_EXTRACT(task.input_payload, '$.format')), '')
    )
WHERE script.generation_duration IS NULL
   OR script.generation_format IS NULL;
