package com.aiscript.modules.generation.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.generation.dto.DubbingCreateDTO;
import com.aiscript.modules.generation.dto.ExportCreateDTO;
import com.aiscript.modules.generation.dto.TimelineSaveDTO;
import com.aiscript.modules.generation.dto.VideoGenerateDTO;
import com.aiscript.modules.generation.service.ProductionService;
import com.aiscript.modules.generation.vo.DubbingAssetVO;
import com.aiscript.modules.generation.vo.ExportJobVO;
import com.aiscript.modules.generation.vo.TimelineConfigVO;
import com.aiscript.modules.generation.vo.VideoSegmentVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ProductionController {
    private final ProductionService productionService;

    public ProductionController(ProductionService productionService) {
        this.productionService = productionService;
    }

    @PostMapping("/generation/videos")
    public R<VideoSegmentVO> generateVideo(@RequestBody VideoGenerateDTO dto) {
        return R.ok(productionService.createVideoSegment(dto));
    }

    @PostMapping("/generation/dubbing")
    public R<DubbingAssetVO> createDubbing(@RequestBody DubbingCreateDTO dto) {
        return R.ok(productionService.createDubbing(dto));
    }

    @GetMapping("/projects/{projectId}/timeline")
    public R<TimelineConfigVO> getTimeline(@PathVariable Integer projectId) {
        return R.ok(productionService.getTimeline(projectId));
    }

    @PutMapping("/projects/timeline")
    public R<TimelineConfigVO> saveTimeline(@RequestBody TimelineSaveDTO dto) {
        return R.ok(productionService.saveTimeline(dto));
    }

    @PostMapping("/exports")
    public R<ExportJobVO> createExport(@RequestBody ExportCreateDTO dto) {
        return R.ok(productionService.createExport(dto));
    }

    @GetMapping("/exports")
    public R<PageResult<ExportJobVO>> exportJobs(PageQuery query, @RequestParam(required = false) String projectId) {
        return R.ok(productionService.exportJobs(query, projectId));
    }

    @PostMapping("/exports/{id}/retry")
    public R<ExportJobVO> retryExport(@PathVariable Integer id) {
        return R.ok(productionService.retryExport(id));
    }

    @DeleteMapping("/exports/{id}")
    public R<Void> cancelExport(@PathVariable Integer id) {
        productionService.cancelExport(id);
        return R.ok();
    }
}
