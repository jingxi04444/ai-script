INSERT INTO sys_prompt_template (
  id, tenant_id, provider_id, scene_code, template_name, version_no, system_prompt, user_prompt, response_schema, status
) VALUES
  (24, NULL, NULL, 'source_copy_analyze', '爆款文案结构分析Prompt', 'v1', '你是商业短视频爆款文案结构分析专家。请只输出中文分析结果，便于后续生成带货脚本。', '请根据分析模式和原始文案，输出可复刻的结构分析。要求简洁、具体、可直接用于后续脚本生成。', JSON_OBJECT('type', 'object'), 1)
ON DUPLICATE KEY UPDATE
  template_name = VALUES(template_name),
  system_prompt = VALUES(system_prompt),
  user_prompt = VALUES(user_prompt),
  response_schema = VALUES(response_schema),
  status = VALUES(status);
