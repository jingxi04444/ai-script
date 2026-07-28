package com.aiscript.modules.project.mapper;

import com.aiscript.modules.project.entity.AiProject;
import com.aiscript.modules.project.vo.ProjectStatsRow;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import org.apache.ibatis.annotations.Param;

public interface AiProjectMapper extends BaseMapper<AiProject> {
    IPage<ProjectStatsRow> selectPageWithStats(
        IPage<ProjectStatsRow> page,
        @Param("tenantId") Integer tenantId,
        @Param("ownerId") Integer ownerId,
        @Param("keyword") String keyword,
        @Param("status") String status
    );

    ProjectStatsRow selectStatsById(
        @Param("projectId") Integer projectId,
        @Param("tenantId") Integer tenantId,
        @Param("ownerId") Integer ownerId
    );
}
