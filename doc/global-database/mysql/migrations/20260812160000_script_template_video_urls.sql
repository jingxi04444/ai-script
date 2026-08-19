SET NAMES utf8mb4;

ALTER TABLE ai_script_template
  ADD COLUMN preview_video_url VARCHAR(1000) DEFAULT NULL COMMENT '前台展示的5秒预览视频链接' AFTER reference_desc,
  ADD COLUMN full_video_url VARCHAR(1000) DEFAULT NULL COMMENT '仅后台使用的完整视频链接' AFTER preview_video_url;
