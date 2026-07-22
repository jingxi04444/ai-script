package com.aiscript.modules.generation.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.generation.dto.DubbingCreateDTO;
import com.aiscript.modules.generation.dto.ExportCreateDTO;
import com.aiscript.modules.generation.dto.TimelineSaveDTO;
import com.aiscript.modules.generation.dto.VideoGenerateDTO;
import com.aiscript.modules.generation.vo.DubbingAssetVO;
import com.aiscript.modules.generation.vo.ExportJobVO;
import com.aiscript.modules.generation.vo.TimelineConfigVO;
import com.aiscript.modules.generation.vo.VideoSegmentVO;

public interface ProductionService {
    VideoSegmentVO createVideoSegment(VideoGenerateDTO dto);
    DubbingAssetVO createDubbing(DubbingCreateDTO dto);
    TimelineConfigVO saveTimeline(TimelineSaveDTO dto);
    TimelineConfigVO getTimeline(Integer projectId);
    ExportJobVO createExport(ExportCreateDTO dto);
    PageResult<ExportJobVO> exportJobs(PageQuery query, String projectId);
}
