package com.aiscript.modules.brief.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.brief.dto.BriefDetectDTO;
import com.aiscript.modules.brief.service.BriefAiService;
import com.aiscript.modules.brief.vo.BriefAiResultVO;
import com.aiscript.modules.brief.vo.BriefDetectionReportVO;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/briefs/{briefId}/ai")
public class BriefAiController {
    private final BriefAiService briefAiService;

    public BriefAiController(BriefAiService briefAiService) {
        this.briefAiService = briefAiService;
    }

    @PostMapping("/detect")
    public R<BriefDetectionReportVO> detect(@PathVariable Integer briefId, @Valid @RequestBody BriefDetectDTO dto) {
        return R.ok(briefAiService.detect(briefId, dto));
    }

    @PostMapping("/optimize")
    public R<BriefAiResultVO> optimize(@PathVariable Integer briefId) {
        return R.ok(briefAiService.optimize(briefId));
    }

    @PostMapping("/score")
    public R<BriefAiResultVO> score(@PathVariable Integer briefId) {
        return R.ok(briefAiService.score(briefId));
    }
}
