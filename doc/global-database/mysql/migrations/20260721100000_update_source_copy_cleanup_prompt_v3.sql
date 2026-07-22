-- ASR 文案整理 v3：每个完整句子单独占一行。

USE ai_script;

UPDATE sys_prompt_template
SET version_no = 'v3',
    user_prompt = REPLACE(
      user_prompt,
      '在不删减、不合并、不调整词语顺序的前提下，根据语义和自然停顿合理分段，每段表达一个相对完整的意思；不得把每个短句机械地拆成一段；',
      '在不删减、不合并、不调整词语顺序的前提下分段。每个以“。！？；”结束的完整句子必须单独占一行；同一句内部的逗号停顿不得强制换行；'
    ),
    update_time = CURRENT_TIMESTAMP
WHERE scene_code = 'source_copy_cleanup'
  AND version_no = 'v2'
  AND deleted = 0
  AND user_prompt LIKE '%不得把每个短句机械地拆成一段%';
