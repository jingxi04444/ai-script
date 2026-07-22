package com.aiscript.modules.analytics.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.analytics.dto.AbTestSaveDTO;
import com.aiscript.modules.analytics.dto.AbTestVariantSaveDTO;
import com.aiscript.modules.analytics.dto.AnalyticsMetricSaveDTO;
import com.aiscript.modules.analytics.dto.MonitorLinkSaveDTO;
import com.aiscript.modules.analytics.vo.AbTestVO;
import com.aiscript.modules.analytics.vo.AbTestVariantVO;
import com.aiscript.modules.analytics.vo.AnalyticsMetricVO;
import com.aiscript.modules.analytics.vo.MonitorLinkVO;
import java.util.List;

public interface AnalyticsService {
    PageResult<MonitorLinkVO> monitorLinks(PageQuery query, String projectId);
    MonitorLinkVO saveMonitorLink(Integer id, MonitorLinkSaveDTO dto);
    PageResult<AnalyticsMetricVO> metrics(PageQuery query, String projectId);
    AnalyticsMetricVO saveMetric(AnalyticsMetricSaveDTO dto);
    PageResult<AbTestVO> abTests(PageQuery query, String projectId);
    AbTestVO saveAbTest(Integer id, AbTestSaveDTO dto);
    List<AbTestVariantVO> variants(Integer abTestId);
    AbTestVariantVO saveVariant(Integer abTestId, Integer id, AbTestVariantSaveDTO dto);
}
