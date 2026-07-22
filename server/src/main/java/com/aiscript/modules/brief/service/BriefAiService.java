package com.aiscript.modules.brief.service;

import com.aiscript.modules.brief.dto.BriefDetectDTO;
import com.aiscript.modules.brief.vo.BriefAiResultVO;
import com.aiscript.modules.brief.vo.BriefDetectionReportVO;

public interface BriefAiService {
    BriefDetectionReportVO detect(Integer briefId, BriefDetectDTO dto);
    BriefAiResultVO optimize(Integer briefId);
    BriefAiResultVO score(Integer briefId);
}
