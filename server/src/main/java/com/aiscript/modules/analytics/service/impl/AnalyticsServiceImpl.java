package com.aiscript.modules.analytics.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.analytics.dto.AbTestSaveDTO;
import com.aiscript.modules.analytics.dto.AbTestVariantSaveDTO;
import com.aiscript.modules.analytics.dto.AnalyticsMetricSaveDTO;
import com.aiscript.modules.analytics.dto.MonitorLinkSaveDTO;
import com.aiscript.modules.analytics.entity.AiAbTest;
import com.aiscript.modules.analytics.entity.AiAbTestVariant;
import com.aiscript.modules.analytics.entity.AiAnalyticsMetric;
import com.aiscript.modules.analytics.entity.AiMonitorLink;
import com.aiscript.modules.analytics.mapper.AiAbTestMapper;
import com.aiscript.modules.analytics.mapper.AiAbTestVariantMapper;
import com.aiscript.modules.analytics.mapper.AiAnalyticsMetricMapper;
import com.aiscript.modules.analytics.mapper.AiMonitorLinkMapper;
import com.aiscript.modules.analytics.service.AnalyticsService;
import com.aiscript.modules.analytics.vo.AbTestVO;
import com.aiscript.modules.analytics.vo.AbTestVariantVO;
import com.aiscript.modules.analytics.vo.AnalyticsMetricVO;
import com.aiscript.modules.analytics.vo.MonitorLinkVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class AnalyticsServiceImpl implements AnalyticsService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private final AiMonitorLinkMapper monitorLinkMapper;
    private final AiAnalyticsMetricMapper metricMapper;
    private final AiAbTestMapper abTestMapper;
    private final AiAbTestVariantMapper variantMapper;

    public AnalyticsServiceImpl(
        AiMonitorLinkMapper monitorLinkMapper,
        AiAnalyticsMetricMapper metricMapper,
        AiAbTestMapper abTestMapper,
        AiAbTestVariantMapper variantMapper
    ) {
        this.monitorLinkMapper = monitorLinkMapper;
        this.metricMapper = metricMapper;
        this.abTestMapper = abTestMapper;
        this.variantMapper = variantMapper;
    }

    @Override
    public PageResult<MonitorLinkVO> monitorLinks(PageQuery query, String projectId) {
        QueryWrapper<AiMonitorLink> wrapper = new QueryWrapper<>();
        if (StringUtils.hasText(projectId)) {
            wrapper.eq("project_id", parseLong(projectId, "项目ID格式不正确"));
        }
        wrapper.orderByDesc("create_time");
        IPage<AiMonitorLink> page = monitorLinkMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toMonitorLinkVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public MonitorLinkVO saveMonitorLink(Integer id, MonitorLinkSaveDTO dto) {
        AiMonitorLink link = id == null ? new AiMonitorLink() : monitorLinkMapper.selectById(id);
        if (link == null) {
            throw new BusinessException("监测链接不存在");
        }
        link.tenantId = currentTenantId();
        link.projectId = parseLong(dto.projectId, "项目ID不能为空或格式不正确");
        link.scriptId = StringUtils.hasText(dto.scriptId) ? parseLong(dto.scriptId, "脚本ID格式不正确") : null;
        link.linkType = StringUtils.hasText(dto.linkType) ? dto.linkType : "campaign";
        link.variantName = dto.variantName;
        link.url = dto.url;
        link.status = dto.status == null ? 1 : dto.status;
        if (id == null) {
            monitorLinkMapper.insert(link);
        } else {
            monitorLinkMapper.updateById(link);
        }
        return toMonitorLinkVO(link);
    }

    @Override
    public PageResult<AnalyticsMetricVO> metrics(PageQuery query, String projectId) {
        QueryWrapper<AiAnalyticsMetric> wrapper = new QueryWrapper<>();
        if (StringUtils.hasText(projectId)) {
            wrapper.eq("project_id", parseLong(projectId, "项目ID格式不正确"));
        }
        wrapper.orderByDesc("metric_date");
        IPage<AiAnalyticsMetric> page = metricMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toMetricVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AnalyticsMetricVO saveMetric(AnalyticsMetricSaveDTO dto) {
        AiAnalyticsMetric metric = new AiAnalyticsMetric();
        metric.tenantId = currentTenantId();
        metric.projectId = StringUtils.hasText(dto.projectId) ? parseLong(dto.projectId, "项目ID格式不正确") : null;
        metric.scriptId = StringUtils.hasText(dto.scriptId) ? parseLong(dto.scriptId, "脚本ID格式不正确") : null;
        metric.monitorLinkId = StringUtils.hasText(dto.monitorLinkId) ? parseLong(dto.monitorLinkId, "监测链接ID格式不正确") : null;
        metric.source = StringUtils.hasText(dto.source) ? dto.source : "manual";
        metric.metricDate = StringUtils.hasText(dto.metricDate) ? LocalDate.parse(dto.metricDate) : LocalDate.now();
        metric.plays = value(dto.plays);
        metric.likes = value(dto.likes);
        metric.comments = value(dto.comments);
        metric.favorites = value(dto.favorites);
        metric.shares = value(dto.shares);
        metric.orders = value(dto.orders);
        metric.revenue = dto.revenue == null ? BigDecimal.ZERO : dto.revenue;
        metric.roi = dto.roi;
        metricMapper.insert(metric);
        return toMetricVO(metric);
    }

    @Override
    public PageResult<AbTestVO> abTests(PageQuery query, String projectId) {
        QueryWrapper<AiAbTest> wrapper = new QueryWrapper<>();
        if (StringUtils.hasText(projectId)) {
            wrapper.eq("project_id", parseLong(projectId, "项目ID格式不正确"));
        }
        wrapper.orderByDesc("create_time");
        IPage<AiAbTest> page = abTestMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        return new PageResult<>(page.getRecords().stream().map(this::toAbTestVO).toList(), page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AbTestVO saveAbTest(Integer id, AbTestSaveDTO dto) {
        AiAbTest test = id == null ? new AiAbTest() : abTestMapper.selectById(id);
        if (test == null) {
            throw new BusinessException("A/B测试不存在");
        }
        test.setTenantId(currentTenantId());
        test.projectId = parseLong(dto.projectId, "项目ID不能为空或格式不正确");
        test.testName = dto.testName;
        test.status = StringUtils.hasText(dto.status) ? dto.status : "draft";
        test.startTime = StringUtils.hasText(dto.startTime) ? LocalDateTime.parse(dto.startTime) : null;
        test.endTime = StringUtils.hasText(dto.endTime) ? LocalDateTime.parse(dto.endTime) : null;
        if (id == null) {
            abTestMapper.insert(test);
        } else {
            abTestMapper.updateById(test);
        }
        return toAbTestVO(test);
    }

    @Override
    public List<AbTestVariantVO> variants(Integer abTestId) {
        return variantMapper.selectList(new QueryWrapper<AiAbTestVariant>().eq("ab_test_id", abTestId))
            .stream().map(this::toVariantVO).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AbTestVariantVO saveVariant(Integer abTestId, Integer id, AbTestVariantSaveDTO dto) {
        if (abTestMapper.selectById(abTestId) == null) {
            throw new BusinessException("A/B测试不存在");
        }
        AiAbTestVariant variant = id == null ? new AiAbTestVariant() : variantMapper.selectById(id);
        if (variant == null) {
            throw new BusinessException("A/B测试版本不存在");
        }
        variant.abTestId = abTestId;
        variant.scriptId = StringUtils.hasText(dto.scriptId) ? parseLong(dto.scriptId, "脚本ID格式不正确") : null;
        variant.variantName = dto.variantName;
        variant.monitorLinkId = StringUtils.hasText(dto.monitorLinkId) ? parseLong(dto.monitorLinkId, "监测链接ID格式不正确") : null;
        variant.plays = value(dto.plays);
        variant.interactionRate = dto.interactionRate;
        variant.conversionRate = dto.conversionRate;
        variant.isWinner = dto.isWinner == null ? 0 : dto.isWinner;
        if (id == null) {
            variantMapper.insert(variant);
        } else {
            variantMapper.updateById(variant);
        }
        return toVariantVO(variant);
    }

    private MonitorLinkVO toMonitorLinkVO(AiMonitorLink item) {
        MonitorLinkVO vo = new MonitorLinkVO();
        vo.id = String.valueOf(item.id);
        vo.projectId = String.valueOf(item.projectId);
        vo.scriptId = item.scriptId == null ? null : String.valueOf(item.scriptId);
        vo.linkType = item.linkType;
        vo.variantName = item.variantName;
        vo.url = item.url;
        vo.status = item.status;
        vo.createdAt = item.createTime == null ? null : item.createTime.toString();
        return vo;
    }

    private AnalyticsMetricVO toMetricVO(AiAnalyticsMetric item) {
        AnalyticsMetricVO vo = new AnalyticsMetricVO();
        vo.id = String.valueOf(item.id);
        vo.projectId = item.projectId == null ? null : String.valueOf(item.projectId);
        vo.scriptId = item.scriptId == null ? null : String.valueOf(item.scriptId);
        vo.monitorLinkId = item.monitorLinkId == null ? null : String.valueOf(item.monitorLinkId);
        vo.source = item.source;
        vo.metricDate = item.metricDate == null ? null : item.metricDate.toString();
        vo.plays = item.plays;
        vo.likes = item.likes;
        vo.comments = item.comments;
        vo.favorites = item.favorites;
        vo.shares = item.shares;
        vo.orders = item.orders;
        vo.revenue = item.revenue;
        vo.roi = item.roi;
        vo.createdAt = item.createTime == null ? null : item.createTime.toString();
        return vo;
    }

    private AbTestVO toAbTestVO(AiAbTest item) {
        AbTestVO vo = new AbTestVO();
        vo.id = String.valueOf(item.getId());
        vo.projectId = String.valueOf(item.projectId);
        vo.testName = item.testName;
        vo.status = item.status;
        vo.startTime = item.startTime == null ? null : item.startTime.toString();
        vo.endTime = item.endTime == null ? null : item.endTime.toString();
        vo.createdAt = item.getCreateTime() == null ? null : item.getCreateTime().toString();
        vo.updatedAt = item.getUpdateTime() == null ? null : item.getUpdateTime().toString();
        return vo;
    }

    private AbTestVariantVO toVariantVO(AiAbTestVariant item) {
        AbTestVariantVO vo = new AbTestVariantVO();
        vo.id = String.valueOf(item.id);
        vo.abTestId = String.valueOf(item.abTestId);
        vo.scriptId = item.scriptId == null ? null : String.valueOf(item.scriptId);
        vo.variantName = item.variantName;
        vo.monitorLinkId = item.monitorLinkId == null ? null : String.valueOf(item.monitorLinkId);
        vo.plays = item.plays;
        vo.interactionRate = item.interactionRate;
        vo.conversionRate = item.conversionRate;
        vo.isWinner = item.isWinner;
        vo.createdAt = item.createTime == null ? null : item.createTime.toString();
        return vo;
    }

    private Long value(Long value) {
        return value == null ? 0L : value;
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private Integer parseLong(String value, String message) {
        try {
            return Integer.valueOf(value);
        } catch (Exception ex) {
            throw new BusinessException(message);
        }
    }
}
