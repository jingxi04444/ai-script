-- Keep the editable prompt configuration aligned with the runtime title contract.
UPDATE sys_prompt_template
SET system_prompt = CONCAT(
    RTRIM(system_prompt),
    CHAR(10), CHAR(10),
    '最终输出第一行必须严格为“标题：<10-30字创意标题>”，标题不得编造产品事实或使用占位符；空一行后再输出完整脚本，标题必须位于Markdown表格外。'
)
WHERE scene_code IN ('script_generate_viral', 'script_generate_template', 'script_generate_original')
  AND system_prompt NOT LIKE '%第一行必须严格%标题：%';

UPDATE sys_script_format_config
SET format_requirement = CONCAT(
    '第一行输出“标题：<创意标题>”，空一行后再输出正文；标题不得放入Markdown表格。',
    format_requirement
)
WHERE code = 'storyboard'
  AND format_requirement NOT LIKE '%标题：%';
