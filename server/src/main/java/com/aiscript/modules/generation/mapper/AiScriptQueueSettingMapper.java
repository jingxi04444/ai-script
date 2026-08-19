package com.aiscript.modules.generation.mapper;

import com.aiscript.modules.generation.entity.AiScriptQueueSetting;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface AiScriptQueueSettingMapper extends BaseMapper<AiScriptQueueSetting> {
    @Select("""
        SELECT * FROM ai_script_queue_setting
        WHERE tenant_id = #{tenantId} AND user_id = #{userId} AND deleted = 0 LIMIT 1
        """)
    AiScriptQueueSetting selectOwned(@Param("tenantId") Integer tenantId, @Param("userId") Integer userId);
}
