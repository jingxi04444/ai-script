-- 新增链接解析后的 ASR 文案整理 Prompt。
-- Safe to run repeatedly: 已存在相同场景编码时保留后台当前配置。

USE ai_script;

INSERT INTO sys_prompt_template (
  tenant_id, provider_id, scene_code, template_name, version_no, system_prompt, user_prompt, response_schema, status
)
SELECT NULL, NULL, 'source_copy_cleanup', 'ASR文案整理Prompt', 'v3',
  '你是专业的短视频ASR逐字稿校对员。这份逐字稿将用于拆解爆款文案，必须忠实保留每一个原始口语信息。你只能纠正上下文完全明确的明显同音错字、补充标点和按语义分段；不得删除、改写、调换、概括或补充任何词语。只输出整理后的纯文本，不要标题、说明、Markdown或JSON。',
  '请整理下面的短视频ASR原始逐字稿：\n\n{{copy}}\n\n整理要求（必须全部遵守）：\n1. 只纠正上下文完全明确的同音、近音造成的明显错别字；不确定时保持原样，不得润色；\n2. 严禁删减任何内容。所有口头禅、重复词、填充词（例如“那个、然后、就是、嗯、啊”）、语气词、口吃、卡顿、倒装以及没说完的话，都必须原样保留；\n3. 在不删减、不合并、不调整词语顺序的前提下分段。每个以“。！？；”结束的完整句子必须单独占一行；同一句内部的逗号停顿不得强制换行；\n4. 标点必须体现原始口语语气：疑问使用“？”，感叹使用“！”，句中停顿使用“，”或“、”；只有完整陈述句才使用“。”，严禁把所有句子统一处理成句号结尾；\n5. 不总结、不概括、不分析、不改写、不重新组织，也不得添加原文没有的信息；\n6. 只返回整理后的完整文案，不要附带任何说明或标记。',
  NULL, 1
WHERE NOT EXISTS (
  SELECT 1 FROM sys_prompt_template WHERE scene_code = 'source_copy_cleanup' AND deleted = 0
);
