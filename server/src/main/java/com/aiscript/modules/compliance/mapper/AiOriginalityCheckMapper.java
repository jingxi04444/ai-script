package com.aiscript.modules.compliance.mapper;

import com.aiscript.modules.compliance.entity.AiOriginalityCheck;
import com.aiscript.modules.compliance.vo.OriginalityCandidateRow;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface AiOriginalityCheckMapper extends BaseMapper<AiOriginalityCheck> {
    List<OriginalityCandidateRow> selectOriginalityCandidates(
        @Param("tenantId") Integer tenantId,
        @Param("currentVersionId") Integer currentVersionId
    );
}
