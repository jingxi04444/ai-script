-- Split title behavior out of the three script-generation prompts so it can be
-- maintained independently for both first generation and later polishing.
INSERT INTO sys_prompt_template (
  tenant_id, provider_id, scene_code, template_name, version_no,
  system_prompt, user_prompt, response_schema, status
)
SELECT
  NULL,
  NULL,
  'script_title_rules',
  '脚本标题生成与润色规则',
  'v1',
  '【脚本标题硬性规则】最终输出第一行必须严格使用“标题：<创意标题>”格式，标题应基于本次 Brief 和脚本内容创作，建议 10-30 个字，具体、有吸引力但不得编造产品事实。标题不得使用 Markdown 标题符号、加粗符号或占位符。标题行后空一行，再输出所选格式的完整脚本；若正文为 Markdown 表格，标题必须放在表格外。',
  '【脚本标题规则】完整结果必须保留首行“标题：<创意标题>”及其后的空行。用户未明确要求修改标题时必须逐字保留原稿标题；只有用户或标题定位评论明确要求改标题时，才根据修改后的脚本更新标题。标题不得放入 Markdown 表格。',
  NULL,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM sys_prompt_template
  WHERE tenant_id IS NULL
    AND scene_code = 'script_title_rules'
    AND deleted = 0
);

-- Remove only the former built-in title clauses. Other administrator edits in
-- these generation prompts are preserved.
UPDATE sys_prompt_template
SET system_prompt = TRIM(REPLACE(
      REPLACE(
        system_prompt,
        '最终输出第一行必须严格为“标题：<10-30字创意标题>”，标题不得编造产品事实，空一行后再输出完整脚本。',
        ''
      ),
      '最终输出第一行必须严格为“标题：<10-30字创意标题>”，标题不得编造产品事实或使用占位符；空一行后再输出完整脚本，标题必须位于Markdown表格外。',
      ''
    )),
    user_prompt = TRIM(REPLACE(user_prompt, '标题必须位于Markdown表格外。', ''))
WHERE tenant_id IS NULL
  AND scene_code IN ('script_generate_viral', 'script_generate_template', 'script_generate_original')
  AND deleted = 0;
