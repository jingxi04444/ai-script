-- 为现有数据库补齐前台 Brief 检测接口实际使用的 brief_detect Prompt。
INSERT INTO sys_prompt_template (
  tenant_id, provider_id, scene_code, template_name, version_no,
  system_prompt, user_prompt, response_schema, status
)
SELECT
  NULL,
  NULL,
  'brief_detect',
  'Brief检测与重构默认Prompt',
  'v1',
  '你是商业短视频产品Brief检测与重构专家。请检查Brief完整性、结构化、场景痛点、情感价值、数据支撑和规范合规，给出可执行建议及重构示例。严格输出JSON，不输出Markdown或解释；不得编造认证、专利、实验数据或百分比。',
  '请检测以下产品Brief：{{briefContent}}。返回JSON对象，必须包含totalScore（0-100整数）、maxScore（100）、grade、level、levelText、summary、metrics、seriousRisks、riskSummary、suggestions、reconstructedExample。metrics必须包含completeness、structure、painPoint、emotion、dataSupport、compliance六项，每项包含key、label、score、maxScore、tone、level。suggestions每项包含index、title、detail、content。reconstructedExample必须是可被JSON.parse解析的JSON字符串，保留输入中的非空信息，并包含productName、price、slogan、targetAudience、productFeatures、coreSellingPoints、secondarySellingPoints、usageScenarios、dataEvidence、emotionalTag、complianceNote；缺失信息标记待补充，不得虚构。',
  JSON_OBJECT(
    'type', 'object',
    'required', JSON_ARRAY('totalScore', 'metrics', 'suggestions', 'reconstructedExample')
  ),
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM sys_prompt_template
  WHERE scene_code = 'brief_detect'
    AND deleted = 0
);
