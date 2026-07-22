package com.aiscript.modules.analytics.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.analytics.dto.AbTestSaveDTO;
import com.aiscript.modules.analytics.dto.AbTestVariantSaveDTO;
import com.aiscript.modules.analytics.dto.AnalyticsMetricSaveDTO;
import com.aiscript.modules.analytics.dto.MonitorLinkSaveDTO;
import com.aiscript.modules.analytics.service.AnalyticsService;
import com.aiscript.modules.analytics.vo.AbTestVO;
import com.aiscript.modules.analytics.vo.AbTestVariantVO;
import com.aiscript.modules.analytics.vo.AnalyticsMetricVO;
import com.aiscript.modules.analytics.vo.MonitorLinkVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/monitor-links")
    public R<PageResult<MonitorLinkVO>> monitorLinks(PageQuery query, @RequestParam(required = false) String projectId) {
        return R.ok(analyticsService.monitorLinks(query, projectId));
    }

    @PostMapping("/monitor-links")
    public R<MonitorLinkVO> createMonitorLink(@RequestBody MonitorLinkSaveDTO dto) {
        return R.ok(analyticsService.saveMonitorLink(null, dto));
    }

    @PutMapping("/monitor-links/{id}")
    public R<MonitorLinkVO> updateMonitorLink(@PathVariable Integer id, @RequestBody MonitorLinkSaveDTO dto) {
        return R.ok(analyticsService.saveMonitorLink(id, dto));
    }

    @GetMapping("/metrics")
    public R<PageResult<AnalyticsMetricVO>> metrics(PageQuery query, @RequestParam(required = false) String projectId) {
        return R.ok(analyticsService.metrics(query, projectId));
    }

    @PostMapping("/metrics")
    public R<AnalyticsMetricVO> saveMetric(@RequestBody AnalyticsMetricSaveDTO dto) {
        return R.ok(analyticsService.saveMetric(dto));
    }

    @GetMapping("/ab-tests")
    public R<PageResult<AbTestVO>> abTests(PageQuery query, @RequestParam(required = false) String projectId) {
        return R.ok(analyticsService.abTests(query, projectId));
    }

    @PostMapping("/ab-tests")
    public R<AbTestVO> createAbTest(@RequestBody AbTestSaveDTO dto) {
        return R.ok(analyticsService.saveAbTest(null, dto));
    }

    @PutMapping("/ab-tests/{id}")
    public R<AbTestVO> updateAbTest(@PathVariable Integer id, @RequestBody AbTestSaveDTO dto) {
        return R.ok(analyticsService.saveAbTest(id, dto));
    }

    @GetMapping("/ab-tests/{id}/variants")
    public R<List<AbTestVariantVO>> variants(@PathVariable Integer id) {
        return R.ok(analyticsService.variants(id));
    }

    @PostMapping("/ab-tests/{id}/variants")
    public R<AbTestVariantVO> createVariant(@PathVariable Integer id, @RequestBody AbTestVariantSaveDTO dto) {
        return R.ok(analyticsService.saveVariant(id, null, dto));
    }

    @PutMapping("/ab-tests/{id}/variants/{variantId}")
    public R<AbTestVariantVO> updateVariant(@PathVariable Integer id, @PathVariable Integer variantId, @RequestBody AbTestVariantSaveDTO dto) {
        return R.ok(analyticsService.saveVariant(id, variantId, dto));
    }
}
