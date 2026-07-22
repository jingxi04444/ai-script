package com.aiscript.modules.source.service;

import com.aiscript.modules.source.dto.CopyExtractDTO;
import com.aiscript.modules.source.dto.CopyAnalyzeDTO;
import com.aiscript.modules.source.dto.LinkExtractDTO;
import com.aiscript.modules.source.dto.SourceParseDTO;
import com.aiscript.modules.generation.vo.GenerationTaskVO;
import com.aiscript.modules.source.vo.LinkExtractVO;
import com.aiscript.modules.source.vo.SourceAnalysisVO;
import java.util.List;

public interface SourceAnalysisService {
    List<SourceAnalysisVO> list(Integer projectId);

    SourceAnalysisVO parseShareUrl(SourceParseDTO dto);

    LinkExtractVO extractShareUrl(LinkExtractDTO dto);

    GenerationTaskVO createParseTask(SourceParseDTO dto);

    SourceAnalysisVO executeParseTask(Integer taskId);

    SourceAnalysisVO analyzeCopy(CopyAnalyzeDTO dto);

    SourceAnalysisVO extractCopy(CopyExtractDTO dto);
}
