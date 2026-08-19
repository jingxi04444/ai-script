package com.aiscript.modules.source.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.source.dto.CopyAnalyzeDTO;
import com.aiscript.modules.source.dto.CopyExtractDTO;
import com.aiscript.modules.source.dto.LinkExtractDTO;
import com.aiscript.modules.source.dto.SourceParseDTO;
import com.aiscript.modules.source.service.SourceAnalysisService;
import com.aiscript.modules.source.vo.LinkExtractVO;
import com.aiscript.modules.source.vo.SourceAnalysisVO;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SourceAnalysisController {
    private final SourceAnalysisService sourceAnalysisService;

    public SourceAnalysisController(SourceAnalysisService sourceAnalysisService) {
        this.sourceAnalysisService = sourceAnalysisService;
    }

    @GetMapping("/source-analysis")
    public R<List<SourceAnalysisVO>> list(@RequestParam Integer projectId) {
        return R.ok(sourceAnalysisService.list(projectId));
    }

    @PostMapping("/video/share-url/parse")
    public R<SourceAnalysisVO> parseShareUrl(@Valid @RequestBody SourceParseDTO dto) {
        return R.ok(sourceAnalysisService.parseShareUrl(dto));
    }

    @PostMapping("/video/share-url/extract")
    public R<LinkExtractVO> extractShareUrl(@Valid @RequestBody LinkExtractDTO dto) {
        return R.ok(sourceAnalysisService.extractShareUrl(dto));
    }

    @PostMapping("/video/share-url/parse-tasks")
    public R<SourceAnalysisVO> parseShareUrlSync(@Valid @RequestBody SourceParseDTO dto) {
        return R.ok(sourceAnalysisService.parseShareUrl(dto));
    }

    @PostMapping("/script-generator/extract-copy")
    public R<SourceAnalysisVO> extractCopy(@Valid @RequestBody CopyExtractDTO dto) {
        return R.ok(sourceAnalysisService.extractCopy(dto));
    }

    @PostMapping("/script-generator/analyze-copy")
    public R<SourceAnalysisVO> analyzeCopy(@RequestBody CopyAnalyzeDTO dto) {
        return R.ok(sourceAnalysisService.analyzeCopy(dto));
    }
}
