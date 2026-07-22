CREATE TABLE IF NOT EXISTS sys_script_format_config (
  id INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  name VARCHAR(80) NOT NULL COMMENT '格式名称',
  code VARCHAR(40) NOT NULL COMMENT '格式编码',
  format_requirement TEXT NOT NULL COMMENT '写脚本格式要求',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '排序值',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0禁用 1启用',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (id),
  UNIQUE KEY uk_sys_script_format_code (code),
  KEY idx_sys_script_format_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本格式配置表';

INSERT INTO sys_script_format_config (code, name, format_requirement, sort_order, status)
SELECT 'storyboard', '分镜脚本表', '请按分镜脚本表输出，至少包含镜号、时长、画面/镜头、人物动作、台词/旁白、字幕、音效/音乐、道具/备注等信息，便于拍摄执行。', 10, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_script_format_config WHERE code = 'storyboard');

INSERT INTO sys_script_format_config (code, name, format_requirement, sort_order, status)
SELECT 'oral', '口播脚本', '请按口播脚本输出，突出开场钩子、痛点共鸣、产品卖点、信任背书和行动引导，语言口语化、节奏紧凑、适合真人出镜直接朗读。', 20, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_script_format_config WHERE code = 'oral');

INSERT INTO sys_script_format_config (code, name, format_requirement, sort_order, status)
SELECT 'shot', '拍摄脚本', '请按拍摄脚本输出，明确拍摄场景、机位/景别、镜头运动、演员调度、画面重点、台词字幕和后期提示，保证现场可执行。', 30, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_script_format_config WHERE code = 'shot');
