package com.aiscript.modules.brief.mapper;

import com.aiscript.modules.brief.entity.AiProjectBriefRef;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiProjectBriefRefMapper extends BaseMapper<AiProjectBriefRef> {
    int upsertReference(
        @Param("tenantId") Integer tenantId,
        @Param("projectId") Integer projectId,
        @Param("briefId") Integer briefId,
        @Param("userId") Integer userId
    );
}
