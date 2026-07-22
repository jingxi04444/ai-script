ALTER TABLE sys_site_config
  ADD COLUMN front_original_scenario_prompts JSON DEFAULT NULL COMMENT '前台AI原创脚本场景与提示词配置' AFTER front_viral_deep_analysis_example;

UPDATE sys_site_config
SET front_original_scenario_prompts = COALESCE(front_original_scenario_prompts, CAST('[{"id":"main-image","title":"电商主图","prompt":"请生成电商主图短视频脚本，重点突出产品第一卖点、视觉冲击、使用场景和下单理由，开头3秒必须快速抓住注意力。"},{"id":"unboxing","title":"产品开箱","prompt":"请生成产品开箱脚本，按照开箱期待、外观细节、核心配件、上手体验、惊喜卖点和购买建议展开。"},{"id":"pain-point","title":"人群痛点产品介绍","prompt":"请围绕目标人群痛点生成产品介绍脚本，先描述真实痛点和使用困扰，再自然引出产品解决方案、关键卖点和转化引导。"},{"id":"product-intro","title":"产品介绍口播","prompt":"请生成产品介绍口播脚本，语言自然直接，包含产品定位、适用人群、核心卖点、使用方法和购买理由。"},{"id":"unboxing-oral","title":"产品开箱口播","prompt":"请生成产品开箱口播脚本，以第一视角表达开箱过程，突出真实感、细节观察、即时体验和种草氛围。"},{"id":"guide","title":"选购攻略/科普","prompt":"请生成选购攻略或科普类脚本，先提出用户常见误区，再给出判断标准，最后带出产品优势和适合购买的人群。"},{"id":"review","title":"测评","prompt":"请生成真实测评脚本，包含测试方法、使用前后对比、优缺点说明、适合人群和购买建议，表达要可信。"},{"id":"vlog","title":"vlog","prompt":"请生成生活方式 vlog 脚本，把产品自然融入一天中的真实场景，强调情绪、氛围、使用过程和生活改善。"},{"id":"desire","title":"氛围欲望激发","prompt":"请生成氛围感和欲望激发型脚本，重点营造画面、情绪、身份感和拥有后的理想状态，弱化硬广感。"}]' AS JSON))
WHERE config_code = 'default';
