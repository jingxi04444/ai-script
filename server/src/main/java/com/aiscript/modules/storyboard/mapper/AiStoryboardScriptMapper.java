package com.aiscript.modules.storyboard.mapper;

import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.aiscript.modules.script.vo.ScriptListVO;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.util.List;
import org.apache.ibatis.annotations.Param;

public interface AiStoryboardScriptMapper extends BaseMapper<AiStoryboardScript> {
    IPage<ScriptListVO> selectScriptPage(
        Page<ScriptListVO> page,
        @Param("tenantId") Integer tenantId,
        @Param("creatorId") Integer creatorId,
        @Param("projectId") Integer projectId,
        @Param("keyword") String keyword,
        @Param("scriptTypes") List<String> scriptTypes,
        @Param("status") String status,
        @Param("sortBy") String sortBy
    );
}
