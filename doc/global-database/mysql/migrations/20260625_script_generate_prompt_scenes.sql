INSERT INTO sys_prompt_template (
  id, tenant_id, provider_id, scene_code, template_name, version_no, system_prompt, user_prompt, response_schema, status
) VALUES
  (21, NULL, NULL, 'script_generate_viral', '爆款复刻脚本生成Prompt', 'v1', '你是专业商业短视频爆款复刻脚本策划。严格按照后台规范生成脚本，不输出解释、变量说明、假设说明或占位符。', '请结合爆款参考文案、结构分析、产品Brief和脚本配置，生成可拍摄的爆款复刻脚本。', JSON_OBJECT('type', 'object'), 1),
  (22, NULL, NULL, 'script_generate_template', '脚本模板库生成Prompt', 'v1', '你是专业商业短视频模板脚本策划。严格按照后台规范和所选模板生成脚本，不输出解释、变量说明、假设说明或占位符。', '请结合所选模板信息、产品Brief和脚本配置，生成可拍摄的模板脚本。', JSON_OBJECT('type', 'object'), 1),
  (23, NULL, NULL, 'script_generate_original', 'AI原创脚本生成Prompt', 'v1', '你是专业商业短视频原创脚本策划。严格按照后台规范生成脚本，不输出解释、变量说明、假设说明或占位符。', '请结合用户创作需求、产品Brief和脚本配置，生成可拍摄的原创脚本。', JSON_OBJECT('type', 'object'), 1)
ON DUPLICATE KEY UPDATE
  template_name = VALUES(template_name),
  system_prompt = VALUES(system_prompt),
  user_prompt = VALUES(user_prompt),
  response_schema = VALUES(response_schema),
  status = VALUES(status);
