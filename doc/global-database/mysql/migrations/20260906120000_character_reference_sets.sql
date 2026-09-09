-- 安全增量升级：仅升级未经管理员编辑的两条原始角色示例；不插入、不复活、不重命名。
-- 执行前备份，并确认当前选择的是目标 ai_script 数据库；本文件不自动连接或切换数据库。
-- 前置：20260905120000_creative_resources.sql；曾导入旧版本角色 seed 的环境才可能命中。
-- 新安装请直接使用更新后的 20260905121000_creative_resources_seed.sql，无需此迁移。
-- 先部署 front-web/admin-web 中已生成并通过QA的全部角色参考 PNG，包括已确认成功的九宫格。
-- 两个角色的九宫格均已生成并通过视觉QA：四个标准槽位齐全，旧综合设定板继续保留为额外参考。
-- 防覆盖：ID+code+类型、未删除、创建/修改人均空、创建/修改时间相等、全部可编辑字段均与旧seed一致。
-- 文本使用二进制比较，避免默认不区分大小写的排序规则把用户修改视为相同；JSON使用结构相等比较。
-- 更新仅涉及 description/gallery_json/config_json；update_time 由表的 ON UPDATE 自动更新。
-- 已编辑、已下架、已软删、已升级、新版本安装数据都会跳过；每次 UPDATE 最多一行，可重复执行。
SET NAMES utf8mb4;
START TRANSACTION;

-- 林沐 · 自然生活：执行前候选数（0 表示已编辑、已升级或不是原始示例）。
SELECT 'character-lin' AS resource_code, COUNT(*) AS eligible_count
FROM sys_creative_resource
WHERE id = '910260905000000101'
  AND deleted = 0
  AND create_by IS NULL AND update_by IS NULL
  AND create_time = update_time
  AND BINARY code = BINARY 'character-lin'
  AND BINARY type = BINARY 'character'
  AND BINARY name = BINARY '林沐 · 自然生活'
  AND BINARY category = BINARY '现代生活'
  AND BINARY description = BINARY '28 岁虚构女性，短发、米白亚麻衬衫。包含独立肖像与正侧背、六种表情设定板，适合生活方式和护肤内容。'
  AND BINARY cover_url = BINARY '/creative-library/character-lin-portrait.png'
  AND BINARY preview_video_url = BINARY ''
  AND gallery_json = CAST('[{"label":"独立肖像","url":"/creative-library/character-lin-portrait.png"},{"label":"正侧背与六种表情","url":"/creative-library/character-lin.png"}]' AS JSON)
  AND tags_json = CAST('["虚构成人","女","自然","生活方式"]' AS JSON)
  AND BINARY prompt = BINARY '使用参考图中的同一位成年虚构角色林沐：28 岁女性，肩长黑发，一侧别于耳后，自然皮肤纹理，米白亚麻衬衫、沙色长裤。保持脸部五官、发型、年龄、服装和体型一致。根据当前分镜完成自然可信的动作和表情。'
  AND BINARY negative_prompt = BINARY '不要改变人物身份，不要变成未成年人，不要塑料皮肤、额外手指或扭曲肢体。'
  AND config_json = CAST('{"applicationMode":"image-reference","identity":"成年女性，肩长黑发，自然五官","wardrobe":"米白亚麻衬衫、沙色直筒长裤","referenceViews":["肖像","正面","侧面","背面","六种表情"]}' AS JSON)
  AND BINARY status = BINARY 'published'
  AND sort_order = 10
  AND BINARY license_note = BINARY 'AI 生成的原创示例，非 LibLib 素材。用于演示与创作参考；正式发布、广告投放或商用前，请完成内容、肖像近似性及适用授权审核。'
  AND BINARY author = BINARY 'AI Script · AI 原创示例';

UPDATE sys_creative_resource
SET description = '28 岁虚构女性，短发、米白亚麻衬衫。提供全身图、面部特写、表情九宫格、多角度设定图及旧综合设定板，适合生活方式和护肤内容。',
    gallery_json = CAST('[{"label":"全身图","url":"/creative-library/character-lin-fullbody.png"},{"label":"面部特写","url":"/creative-library/character-lin-portrait.png"},{"label":"表情九宫格","url":"/creative-library/character-lin-expressions.png"},{"label":"多角度设定图","url":"/creative-library/character-lin-turnaround.png"},{"label":"旧综合设定板（正侧背与六种表情）","url":"/creative-library/character-lin.png"}]' AS JSON),
    config_json = CAST('{"applicationMode":"image-reference","identity":"成年女性，肩长黑发，自然五官","wardrobe":"米白亚麻衬衫、沙色直筒长裤","referenceViews":["全身图","面部特写","表情九宫格","多角度设定图","旧综合设定板（正侧背与六种表情）"]}' AS JSON)
WHERE id = '910260905000000101'
  AND deleted = 0
  AND create_by IS NULL AND update_by IS NULL
  AND create_time = update_time
  AND BINARY code = BINARY 'character-lin'
  AND BINARY type = BINARY 'character'
  AND BINARY name = BINARY '林沐 · 自然生活'
  AND BINARY category = BINARY '现代生活'
  AND BINARY description = BINARY '28 岁虚构女性，短发、米白亚麻衬衫。包含独立肖像与正侧背、六种表情设定板，适合生活方式和护肤内容。'
  AND BINARY cover_url = BINARY '/creative-library/character-lin-portrait.png'
  AND BINARY preview_video_url = BINARY ''
  AND gallery_json = CAST('[{"label":"独立肖像","url":"/creative-library/character-lin-portrait.png"},{"label":"正侧背与六种表情","url":"/creative-library/character-lin.png"}]' AS JSON)
  AND tags_json = CAST('["虚构成人","女","自然","生活方式"]' AS JSON)
  AND BINARY prompt = BINARY '使用参考图中的同一位成年虚构角色林沐：28 岁女性，肩长黑发，一侧别于耳后，自然皮肤纹理，米白亚麻衬衫、沙色长裤。保持脸部五官、发型、年龄、服装和体型一致。根据当前分镜完成自然可信的动作和表情。'
  AND BINARY negative_prompt = BINARY '不要改变人物身份，不要变成未成年人，不要塑料皮肤、额外手指或扭曲肢体。'
  AND config_json = CAST('{"applicationMode":"image-reference","identity":"成年女性，肩长黑发，自然五官","wardrobe":"米白亚麻衬衫、沙色直筒长裤","referenceViews":["肖像","正面","侧面","背面","六种表情"]}' AS JSON)
  AND BINARY status = BINARY 'published'
  AND sort_order = 10
  AND BINARY license_note = BINARY 'AI 生成的原创示例，非 LibLib 素材。用于演示与创作参考；正式发布、广告投放或商用前，请完成内容、肖像近似性及适用授权审核。'
  AND BINARY author = BINARY 'AI Script · AI 原创示例';
SELECT 'character-lin' AS resource_code, ROW_COUNT() AS upgraded_rows;

-- 陈屿 · 都市讲述：执行前候选数（0 表示已编辑、已升级或不是原始示例）。
SELECT 'character-chen' AS resource_code, COUNT(*) AS eligible_count
FROM sys_creative_resource
WHERE id = '910260905000000102'
  AND deleted = 0
  AND create_by IS NULL AND update_by IS NULL
  AND create_time = update_time
  AND BINARY code = BINARY 'character-chen'
  AND BINARY type = BINARY 'character'
  AND BINARY name = BINARY '陈屿 · 都市讲述'
  AND BINARY category = BINARY '现代生活'
  AND BINARY description = BINARY '34 岁虚构男性，藏蓝外套与白色内搭。包含独立肖像与正侧背、六种表情设定板，适合产品讲解和日常场景。'
  AND BINARY cover_url = BINARY '/creative-library/character-chen-portrait.png'
  AND BINARY preview_video_url = BINARY ''
  AND gallery_json = CAST('[{"label":"独立肖像","url":"/creative-library/character-chen-portrait.png"},{"label":"正侧背与六种表情","url":"/creative-library/character-chen.png"}]' AS JSON)
  AND tags_json = CAST('["虚构成人","男","都市","产品讲解"]' AS JSON)
  AND BINARY prompt = BINARY '使用参考图中的同一位成年虚构角色陈屿：34 岁男性，整洁黑色短发，自然皮肤纹理，藏蓝色外套、白色无标识内搭、炭灰长裤。保持人物脸型、五官、发型、服装和身形一致，表情亲切克制，动作自然。'
  AND BINARY negative_prompt = BINARY '不要改变身份、年龄和服装，不要出现名人、品牌标识、额外手指或僵硬表情。'
  AND config_json = CAST('{"applicationMode":"image-reference","identity":"成年男性，整洁黑色短发，亲切表情","wardrobe":"藏蓝外套、白色内搭、炭灰长裤","referenceViews":["肖像","正面","侧面","背面","六种表情"]}' AS JSON)
  AND BINARY status = BINARY 'published'
  AND sort_order = 20
  AND BINARY license_note = BINARY 'AI 生成的原创示例，非 LibLib 素材。用于演示与创作参考；正式发布、广告投放或商用前，请完成内容、肖像近似性及适用授权审核。'
  AND BINARY author = BINARY 'AI Script · AI 原创示例';

UPDATE sys_creative_resource
SET description = '34 岁虚构男性，藏蓝外套与白色内搭。提供全身图、面部特写、表情九宫格、多角度设定图及旧综合设定板，适合产品讲解和日常场景。',
    gallery_json = CAST('[{"label":"全身图","url":"/creative-library/character-chen-fullbody.png"},{"label":"面部特写","url":"/creative-library/character-chen-portrait.png"},{"label":"表情九宫格","url":"/creative-library/character-chen-expressions.png"},{"label":"多角度设定图","url":"/creative-library/character-chen-turnaround.png"},{"label":"旧综合设定板（正侧背与六种表情）","url":"/creative-library/character-chen.png"}]' AS JSON),
    config_json = CAST('{"applicationMode":"image-reference","identity":"成年男性，整洁黑色短发，亲切表情","wardrobe":"藏蓝外套、白色内搭、炭灰长裤","referenceViews":["全身图","面部特写","表情九宫格","多角度设定图","旧综合设定板（正侧背与六种表情）"]}' AS JSON)
WHERE id = '910260905000000102'
  AND deleted = 0
  AND create_by IS NULL AND update_by IS NULL
  AND create_time = update_time
  AND BINARY code = BINARY 'character-chen'
  AND BINARY type = BINARY 'character'
  AND BINARY name = BINARY '陈屿 · 都市讲述'
  AND BINARY category = BINARY '现代生活'
  AND BINARY description = BINARY '34 岁虚构男性，藏蓝外套与白色内搭。包含独立肖像与正侧背、六种表情设定板，适合产品讲解和日常场景。'
  AND BINARY cover_url = BINARY '/creative-library/character-chen-portrait.png'
  AND BINARY preview_video_url = BINARY ''
  AND gallery_json = CAST('[{"label":"独立肖像","url":"/creative-library/character-chen-portrait.png"},{"label":"正侧背与六种表情","url":"/creative-library/character-chen.png"}]' AS JSON)
  AND tags_json = CAST('["虚构成人","男","都市","产品讲解"]' AS JSON)
  AND BINARY prompt = BINARY '使用参考图中的同一位成年虚构角色陈屿：34 岁男性，整洁黑色短发，自然皮肤纹理，藏蓝色外套、白色无标识内搭、炭灰长裤。保持人物脸型、五官、发型、服装和身形一致，表情亲切克制，动作自然。'
  AND BINARY negative_prompt = BINARY '不要改变身份、年龄和服装，不要出现名人、品牌标识、额外手指或僵硬表情。'
  AND config_json = CAST('{"applicationMode":"image-reference","identity":"成年男性，整洁黑色短发，亲切表情","wardrobe":"藏蓝外套、白色内搭、炭灰长裤","referenceViews":["肖像","正面","侧面","背面","六种表情"]}' AS JSON)
  AND BINARY status = BINARY 'published'
  AND sort_order = 20
  AND BINARY license_note = BINARY 'AI 生成的原创示例，非 LibLib 素材。用于演示与创作参考；正式发布、广告投放或商用前，请完成内容、肖像近似性及适用授权审核。'
  AND BINARY author = BINARY 'AI Script · AI 原创示例';
SELECT 'character-chen' AS resource_code, ROW_COUNT() AS upgraded_rows;

COMMIT;
