-- 拆分爆款复刻分析 Prompt：简易文案解析 / 深度拉片拆解。
-- 执行场景：已有数据库升级时执行；全量新库可直接执行 ai_script_mysql_schema.sql + ai_script_mysql_seed.sql。
-- Safe to run repeatedly.

USE ai_script;

INSERT INTO sys_prompt_template (
  tenant_id, provider_id, scene_code, template_name, version_no, system_prompt, user_prompt, response_schema, status
)
SELECT NULL, NULL, 'source_copy_simple_analyze', '简易文案解析Prompt', 'v3',
  '你是商业短视频爆款文案结构分析专家。请基于用户提供的原始文案，输出简洁、清晰、可复刻的文案结构分析。只输出中文编号段落，不要输出 JSON。',
  '原始文案：\n{{copy}}\n\n请对这段短视频文案做“简易文案解析”，重点分析文案本身，不做复杂镜头拆解。\n\n请按以下编号段落输出：\n\n1. 文案整体作用\n说明这段文案主要想完成什么目标，例如吸引注意、制造痛点、建立信任、引导购买等。\n\n2. 段落结构拆解\n按文案顺序拆分结构，说明每一段的作用。\n\n3. 开头钩子\n提炼开头吸引用户继续看的关键话术。\n\n4. 痛点/卖点表达\n提炼文案中出现的用户痛点、产品卖点、利益点。\n\n5. 情绪推进\n说明文案从开头到结尾的情绪变化。\n\n6. 结构公式\n总结成可复用公式，例如：开头钩子 → 痛点放大 → 产品解决方案 → 信任背书 → 行动引导。\n\n7. 可复刻要点\n给出后续生成脚本时可以复用的表达方式。',
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_prompt_template WHERE scene_code = 'source_copy_simple_analyze');

UPDATE sys_prompt_template
SET
  template_name = '简易文案解析Prompt',
  version_no = 'v3',
  system_prompt = '你是商业短视频爆款文案结构分析专家。请基于用户提供的原始文案，输出简洁、清晰、可复刻的文案结构分析。只输出中文编号段落，不要输出 JSON。',
  user_prompt = '原始文案：\n{{copy}}\n\n请对这段短视频文案做“简易文案解析”，重点分析文案本身，不做复杂镜头拆解。\n\n请按以下编号段落输出：\n\n1. 文案整体作用\n说明这段文案主要想完成什么目标，例如吸引注意、制造痛点、建立信任、引导购买等。\n\n2. 段落结构拆解\n按文案顺序拆分结构，说明每一段的作用。\n\n3. 开头钩子\n提炼开头吸引用户继续看的关键话术。\n\n4. 痛点/卖点表达\n提炼文案中出现的用户痛点、产品卖点、利益点。\n\n5. 情绪推进\n说明文案从开头到结尾的情绪变化。\n\n6. 结构公式\n总结成可复用公式，例如：开头钩子 → 痛点放大 → 产品解决方案 → 信任背书 → 行动引导。\n\n7. 可复刻要点\n给出后续生成脚本时可以复用的表达方式。',
  response_schema = NULL,
  status = 1
WHERE scene_code = 'source_copy_simple_analyze';

INSERT INTO sys_prompt_template (
  tenant_id, provider_id, scene_code, template_name, version_no, system_prompt, user_prompt, response_schema, status
)
SELECT NULL, NULL, 'source_copy_deep_analyze', '深度拉片拆解Prompt', 'v3',
  '你是商业短视频爆款拉片分析专家。必须只输出合法 JSON，不要 Markdown，不要解释。JSON 必须包含 dimensions 六项，key/title 固定为：paragraphStructure/段落结构拆解、keyIssues/需要特别指出、fullDeepReport/完整深度拉片报告、structureFormula/结构公式总结、replicationPoints/复刻要点、editingSuggestions/剪辑建议，且每项 content 非空。',
  '原始文案：\n{{copy}}\n\n请对这条短视频做“深度拉片拆解”。即使当前只提供了文案，也请基于文案内容推断可能的镜头节奏、情绪推进、画面设计和转化逻辑。\n\n只输出 JSON，不要使用 ```json 代码块，不要添加 JSON 之外的任何说明。格式必须严格如下：\n{"dimensions":[{"key":"paragraphStructure","title":"段落结构拆解","content":"按开头 0-3 秒、中段铺垫、卖点展开、信任增强、结尾转化拆解结构和作用"},{"key":"keyIssues","title":"需要特别指出","content":"指出爆点、钩子、风险、强转化点、需要保留或规避的表达"},{"key":"fullDeepReport","title":"完整深度拉片报告","content":"完整说明视频核心目的、镜头画面推测、节奏、情绪、转场、卖点表达和转化逻辑"},{"key":"structureFormula","title":"结构公式总结","content":"总结成可复用爆款公式，例如：强钩子 → 场景痛点 → 产品解决 → 结果证明 → 限时行动"},{"key":"replicationPoints","title":"复刻要点","content":"说明后续脚本生成和拍摄时必须复刻的结构、话术、情绪节奏，以及可以替换成新产品的内容"},{"key":"editingSuggestions","title":"剪辑建议","content":"给出剪辑节奏、字幕花字、转场、BGM、产品特写和镜头衔接建议"}]}\n\n要求：六项 content 都不能为空；如果原文信息不足，也要基于文案合理推断。',
  JSON_OBJECT('type', 'object', 'required', JSON_ARRAY('dimensions')), 1
WHERE NOT EXISTS (SELECT 1 FROM sys_prompt_template WHERE scene_code = 'source_copy_deep_analyze');

UPDATE sys_prompt_template
SET
  template_name = '深度拉片拆解Prompt',
  version_no = 'v3',
  system_prompt = '你是商业短视频爆款拉片分析专家。必须只输出合法 JSON，不要 Markdown，不要解释。JSON 必须包含 dimensions 六项，key/title 固定为：paragraphStructure/段落结构拆解、keyIssues/需要特别指出、fullDeepReport/完整深度拉片报告、structureFormula/结构公式总结、replicationPoints/复刻要点、editingSuggestions/剪辑建议，且每项 content 非空。',
  user_prompt = '原始文案：\n{{copy}}\n\n请对这条短视频做“深度拉片拆解”。即使当前只提供了文案，也请基于文案内容推断可能的镜头节奏、情绪推进、画面设计和转化逻辑。\n\n只输出 JSON，不要使用 ```json 代码块，不要添加 JSON 之外的任何说明。格式必须严格如下：\n{"dimensions":[{"key":"paragraphStructure","title":"段落结构拆解","content":"按开头 0-3 秒、中段铺垫、卖点展开、信任增强、结尾转化拆解结构和作用"},{"key":"keyIssues","title":"需要特别指出","content":"指出爆点、钩子、风险、强转化点、需要保留或规避的表达"},{"key":"fullDeepReport","title":"完整深度拉片报告","content":"完整说明视频核心目的、镜头画面推测、节奏、情绪、转场、卖点表达和转化逻辑"},{"key":"structureFormula","title":"结构公式总结","content":"总结成可复用爆款公式，例如：强钩子 → 场景痛点 → 产品解决 → 结果证明 → 限时行动"},{"key":"replicationPoints","title":"复刻要点","content":"说明后续脚本生成和拍摄时必须复刻的结构、话术、情绪节奏，以及可以替换成新产品的内容"},{"key":"editingSuggestions","title":"剪辑建议","content":"给出剪辑节奏、字幕花字、转场、BGM、产品特写和镜头衔接建议"}]}\n\n要求：六项 content 都不能为空；如果原文信息不足，也要基于文案合理推断。',
  response_schema = JSON_OBJECT('type', 'object', 'required', JSON_ARRAY('dimensions')),
  status = 1
WHERE scene_code = 'source_copy_deep_analyze';
