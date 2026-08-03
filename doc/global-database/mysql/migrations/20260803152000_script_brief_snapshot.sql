-- 固化脚本生成时使用的 Brief，确保继续润色上下文不漂移
-- 执行时间：2026-08-03 15:20:00

USE ai_script;
SET NAMES utf8mb4;

ALTER TABLE ai_storyboard_script
  ADD COLUMN brief_id INT DEFAULT NULL COMMENT '生成脚本时使用的Brief ID' AFTER project_id,
  ADD COLUMN brief_snapshot LONGTEXT DEFAULT NULL COMMENT '生成脚本时固化的Brief内容快照' AFTER brief_id,
  ADD KEY idx_ai_storyboard_script_brief (brief_id);

-- 尽可能从历史生成任务中恢复旧脚本第一次生成时使用的 Brief。
UPDATE ai_storyboard_script script
JOIN (
  SELECT
    CAST(JSON_UNQUOTE(JSON_EXTRACT(result_payload, '$.scriptId')) AS UNSIGNED) AS script_id,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(input_payload, '$.briefId')) AS UNSIGNED) AS brief_id
  FROM ai_generation_task
  WHERE task_type = 'generate_script'
    AND status = 'success'
    AND JSON_EXTRACT(result_payload, '$.scriptId') IS NOT NULL
    AND JSON_EXTRACT(input_payload, '$.briefId') IS NOT NULL
) generation ON generation.script_id = script.id
JOIN ai_brief brief ON brief.id = generation.brief_id
SET
  script.brief_id = brief.id,
  script.brief_snapshot = CONCAT_WS('\n',
    IF(NULLIF(brief.product_name, '') IS NULL, NULL, CONCAT('产品名称：', brief.product_name)),
    IF(NULLIF(brief.brief_name, '') IS NULL, NULL, CONCAT('Brief 名称：', brief.brief_name)),
    IF(NULLIF(brief.product_model, '') IS NULL, NULL, CONCAT('产品型号：', brief.product_model)),
    IF(NULLIF(brief.price, '') IS NULL, NULL, CONCAT('价格：', brief.price)),
    IF(NULLIF(brief.slogan, '') IS NULL, NULL, CONCAT('Slogan：', brief.slogan)),
    IF(NULLIF(brief.primary_selling_point, '') IS NULL, NULL, CONCAT('核心卖点：', brief.primary_selling_point)),
    IF(NULLIF(brief.target_audience, '') IS NULL, NULL, CONCAT('目标人群：', brief.target_audience)),
    IF(NULLIF(brief.target_scene, '') IS NULL, NULL, CONCAT('目标场景：', brief.target_scene)),
    IF(NULLIF(brief.other_requirements, '') IS NULL, NULL, CONCAT('其他要求：', brief.other_requirements)),
    IF(NULLIF(brief.brief_content, '') IS NULL, NULL, CONCAT('完整 Brief：', brief.brief_content))
  )
WHERE script.brief_id IS NULL;
