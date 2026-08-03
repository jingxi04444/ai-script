package com.aiscript.modules.brief.mapper;

import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.brief.vo.BriefAssetRowVO;
import com.aiscript.modules.brief.vo.BriefDetailQueryResult;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Delete;

import java.util.List;

public interface AiBriefMapper extends BaseMapper<AiBrief> {
    @Delete("DELETE FROM ai_selling_point WHERE brief_id = #{briefId}")
    int deleteSellingPoints(@Param("briefId") Integer briefId);

    List<BriefAssetRowVO> selectAssetLibraryRows(
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId
    );

    AiBrief selectAccessibleProjectBrief(
        @Param("briefId") Integer briefId,
        @Param("projectId") Integer projectId,
        @Param("userId") Integer userId,
        @Param("tenantId") Integer tenantId
    );

    BriefDetailQueryResult selectDetail(
        @Param("briefId") Integer briefId,
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId
    );
    long countAccessibleBriefs(
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId
    );

    long countNewAccessibleBriefs(
        @Param("tenantId") Integer tenantId,
        @Param("userId") Integer userId,
        @Param("briefIds") List<Integer> briefIds
    );
}
