ALTER TABLE sys_site_config
  ADD COLUMN front_viral_simple_analysis_example TEXT DEFAULT NULL COMMENT '前台爆款复刻简易文案解析案例' AFTER front_home_logo_key,
  ADD COLUMN front_viral_deep_analysis_example TEXT DEFAULT NULL COMMENT '前台爆款复刻深度拉片解析案例' AFTER front_viral_simple_analysis_example;

UPDATE sys_site_config
SET
  front_viral_simple_analysis_example = COALESCE(front_viral_simple_analysis_example, '示例：开场用痛点提问抓注意力；中段用场景复现放大需求；结尾提炼卖点并给出行动引导。'),
  front_viral_deep_analysis_example = COALESCE(front_viral_deep_analysis_example, '示例：从封面、标题、人物造型、文案节奏、结构公式、剪辑风格六个维度拆解爆款内容。')
WHERE config_code = 'default';
