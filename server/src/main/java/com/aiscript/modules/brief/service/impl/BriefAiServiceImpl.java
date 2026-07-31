package com.aiscript.modules.brief.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.integration.llm.LlmClient;
import com.aiscript.modules.brief.dto.BriefDetectDTO;
import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.brief.entity.AiBriefAiResult;
import com.aiscript.modules.brief.mapper.AiBriefAiResultMapper;
import com.aiscript.modules.brief.mapper.AiBriefMapper;
import com.aiscript.modules.brief.service.BriefAiService;
import com.aiscript.modules.brief.vo.BriefAiResultVO;
import com.aiscript.modules.brief.vo.BriefDetectionMetricVO;
import com.aiscript.modules.brief.vo.BriefDetectionReportVO;
import com.aiscript.modules.brief.vo.BriefDetectionSuggestionVO;
import com.aiscript.modules.system.service.PromptRenderService;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.aiscript.security.LoginUser;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BriefAiServiceImpl implements BriefAiService {
    private static final Integer DEFAULT_TENANT_ID = 1;
    private static final Integer DEFAULT_USER_ID = 2;
    private final AiBriefMapper briefMapper;
    private final AiBriefAiResultMapper resultMapper;
    private final LlmClient llmClient;
    private final PromptRenderService promptRenderService;
    private final MembershipEntitlementService entitlementService;
    private final MembershipPointService pointService;

    public BriefAiServiceImpl(AiBriefMapper briefMapper, AiBriefAiResultMapper resultMapper, LlmClient llmClient, PromptRenderService promptRenderService, MembershipEntitlementService entitlementService, MembershipPointService pointService) {
        this.briefMapper = briefMapper;
        this.resultMapper = resultMapper;
        this.llmClient = llmClient;
        this.promptRenderService = promptRenderService;
        this.entitlementService = entitlementService;
        this.pointService = pointService;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefDetectionReportVO detect(Integer briefId, BriefDetectDTO dto) {
        AiBrief brief = briefMapper.selectById(briefId);
        if (brief == null) {
            throw new BusinessException("Brief 不存在");
        }
        LoginUser user = currentUser();
        entitlementService.requireFeature(
            user.getTenantId(), user.getUserId(), "BRIEF_DETECT_ACCESS"
        );
        long pointCost = entitlementService.getLimit(
            user.getTenantId(), user.getUserId(), "BRIEF_DETECT_POINT_COST"
        );
        if (pointCost > 0) {
            String requestNo = dto != null && dto.getRequestNo() != null && !dto.getRequestNo().isBlank()
                ? dto.getRequestNo()
                : "brief_detect:" + briefId + ":" + UUID.randomUUID();
            pointService.consumePoints(
                user.getTenantId(), user.getUserId(), pointCost, requestNo,
                "brief_detect", briefId.longValue(), "Brief检测积分消耗"
            );
        }

        String rawResponse = null;
        BriefDetectionReportVO report = null;
        try {
            PromptRenderService.RenderedPrompt prompt = promptRenderService.render(
                "brief_detect",
                buildDetectSystemPrompt(),
                buildDetectUserPrompt(),
                Map.of("briefContent", buildBriefContent(brief, dto))
            );
            rawResponse = llmClient.chat(prompt.getSystemPrompt(), prompt.getUserPrompt());
            report = parseDetectionReport(rawResponse);
        } catch (Exception ignored) {
            report = null;
        }
        if (report == null) {
            report = buildMockDetectionReport(brief, dto);
            rawResponse = rawResponse == null || rawResponse.isBlank() ? JsonUtils.toJson(report) : rawResponse;
        }
        normalizeDetectionReport(report, brief, dto);
        AiBriefAiResult result = new AiBriefAiResult();
        result.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        result.setBriefId(briefId);
        result.setResultType("detect");
        result.setResultJson(JsonUtils.toJson(report));
        result.setRawResponse(rawResponse);
        result.setCreateBy(currentUser().getUserId());
        resultMapper.insert(result);

        report.id = String.valueOf(result.getId());
        report.createdAt = result.getCreateTime() == null ? null : result.getCreateTime().toString();
        report.evaluatedAt = report.createdAt;
        return report;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefAiResultVO optimize(Integer briefId) {
        return run(briefId, "optimize", "brief_optimize", "你是商业短视频产品Brief优化专家。", "请优化以下Brief并输出JSON：{{briefContent}}");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BriefAiResultVO score(Integer briefId) {
        return run(briefId, "score", "brief_score", "你是商业短视频Brief评分专家。", "请按完整度、卖点清晰度、可拍摄性评分并输出JSON：{{briefContent}}");
    }

    private BriefAiResultVO run(Integer briefId, String resultType, String sceneCode, String defaultSystemPrompt, String defaultUserPrompt) {
        AiBrief brief = briefMapper.selectById(briefId);
        if (brief == null) {
            throw new BusinessException("Brief 不存在");
        }
        String briefContent = JsonUtils.toJson(Map.of(
            "name", brief.getProductName() == null ? "" : brief.getProductName(),
            "productName", brief.getProductName() == null ? "" : brief.getProductName(),
            "primarySellingPoint", brief.getPrimarySellingPoint() == null ? "" : brief.getPrimarySellingPoint(),
            "targetAudience", brief.getTargetAudience() == null ? "" : brief.getTargetAudience(),
            "targetScene", brief.getTargetScene() == null ? "" : brief.getTargetScene(),
            "otherRequirements", brief.getOtherRequirements() == null ? "" : brief.getOtherRequirements(),
            "briefContent", brief.getBriefContent() == null ? "" : brief.getBriefContent()
        ));
        PromptRenderService.RenderedPrompt prompt = promptRenderService.render(sceneCode, defaultSystemPrompt, defaultUserPrompt, Map.of("briefContent", briefContent));
        String raw = llmClient.chat(prompt.getSystemPrompt(), prompt.getUserPrompt());
        if (raw == null || raw.isBlank()) {
            raw = "{\"message\":\"未配置LLM Provider，已创建AI结果记录\"}";
        }
        AiBriefAiResult result = new AiBriefAiResult();
        result.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        result.setBriefId(briefId);
        result.setResultType(resultType);
        result.setResultJson(raw);
        result.setRawResponse(raw);
        result.setCreateBy(currentUser().getUserId());
        resultMapper.insert(result);
        return toVO(result);
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser;
        }
        throw new BusinessException("请先登录");
    }
    private BriefAiResultVO toVO(AiBriefAiResult result) {
        BriefAiResultVO vo = new BriefAiResultVO();
        vo.id = String.valueOf(result.getId());
        vo.briefId = String.valueOf(result.getBriefId());
        vo.resultType = result.getResultType();
        vo.resultJson = result.getResultJson();
        vo.rawResponse = result.getRawResponse();
        vo.createdAt = result.getCreateTime() == null ? null : result.getCreateTime().toString();
        return vo;
    }

    private String buildBriefContent(AiBrief brief, BriefDetectDTO dto) {
        return JsonUtils.toJson(Map.ofEntries(
            Map.entry("productName", firstNonBlank(dto == null ? null : dto.getProductName(), brief.getProductName(), brief.getBriefName(), "")),
            Map.entry("productModel", empty(brief.getProductModel())),
            Map.entry("price", firstNonBlank(dto == null ? null : dto.getPrice(), brief.getPrice(), "")),
            Map.entry("slogan", firstNonBlank(dto == null ? null : dto.getSlogan(), brief.getSlogan(), "")),
            Map.entry("targetAudience", firstNonBlank(dto == null ? null : dto.getTargetAudience(), brief.getTargetAudience(), "")),
            Map.entry("targetScene", firstNonBlank(dto == null ? null : dto.getTargetScene(), brief.getTargetScene(), "")),
            Map.entry("featureSellingPoint", firstNonBlank(dto == null ? null : dto.getFeatureSellingPoint(), dto == null ? null : dto.getTargetScene(), brief.getTargetScene(), "")),
            Map.entry("primarySellingPoint", firstNonBlank(dto == null ? null : dto.getPrimarySellingPoint(), brief.getPrimarySellingPoint(), "")),
            Map.entry("secondarySellingPoint", firstNonBlank(dto == null ? null : dto.getSecondarySellingPoint(), brief.getOtherRequirements(), "")),
            Map.entry("otherRequirements", empty(brief.getOtherRequirements())),
            Map.entry("briefContent", firstNonBlank(dto == null ? null : dto.getBriefContent(), brief.getBriefContent(), ""))
        ));
    }

    private String buildDetectSystemPrompt() {
        return "你是商业短视频产品Brief检测与重构专家。你必须严格输出 JSON，不能输出 Markdown、解释或代码块。"
            + "你需要检查 Brief 完整性、结构化、场景痛点、情感价值、数据支撑、规范合规，"
            + "并给出可执行优化建议，最后直接返回一份优化后的重构示例。"
            + "重要：不得遗漏输入中已有的非空字段；不得编造认证、专利号、实验人数、百分比等事实数据；"
            + "若原文没有数据，只能提示需补充，不能虚构。";
    }

    private String buildDetectUserPrompt() {
        return "请检测以下产品 Brief，并只返回一个 JSON 对象。\n"
            + "Brief 数据：{{briefContent}}\n\n"
            + "你必须先理解输入字段：productName=产品名称，price=产品价格，slogan=产品Slogan，targetAudience=目标人群，"
            + "featureSellingPoint/targetScene=产品特色卖点或使用场景，primarySellingPoint=产品主要卖点，secondarySellingPoint/otherRequirements=产品次要卖点。\n"
            + "评分规则固定如下：完整性20分、结构化15分、场景痛点15分、情感价值15分、数据支撑20分、规范合规15分，总分为六项相加。\n"
            + "扣分标准：产品名称/价格/Slogan/目标人群/产品特色卖点/产品主要卖点/产品次要卖点每缺一项扣5-10分；数据无来源或含绝对化/医疗承诺需扣合规分。\n"
            + "重构示例要求：reconstructedExample 是优化后的最终 Brief 内容，不是解释、不是建议、不是 Markdown。"
            + "必须覆盖所有核心字段；原输入已有的非空字段必须保留并优化表达，不能删掉、不能改成空；"
            + "没有依据的数据、认证、专利号、百分比、测试人数不得编造，只能写“需补充来源/依据”。\n"
            + "返回 JSON 字段必须完全符合：\n"
            + "{\n"
            + "  \"totalScore\": 0-100整数,\n"
            + "  \"maxScore\": 100,\n"
            + "  \"totalMaxScore\": 100,\n"
            + "  \"grade\": \"A-/B+/C等\",\n"
            + "  \"level\": \"excellent|good|warning|danger\",\n"
            + "  \"levelText\": \"中文评级说明\",\n"
            + "  \"summary\": \"一句话总结检测结果和下一步\",\n"
            + "  \"metrics\": [\n"
            + "    {\"key\":\"completeness\",\"label\":\"完整性\",\"score\":0-100,\"maxScore\":100,\"tone\":\"success|warning|danger\",\"level\":\"success|warning|danger\"},\n"
            + "    {\"key\":\"structure\",\"label\":\"结构化\",\"score\":0-100,\"maxScore\":100,\"tone\":\"success|warning|danger\",\"level\":\"success|warning|danger\"},\n"
            + "    {\"key\":\"painPoint\",\"label\":\"场景痛点\",\"score\":0-100,\"maxScore\":100,\"tone\":\"success|warning|danger\",\"level\":\"success|warning|danger\"},\n"
            + "    {\"key\":\"emotion\",\"label\":\"情感价值\",\"score\":0-100,\"maxScore\":100,\"tone\":\"success|warning|danger\",\"level\":\"success|warning|danger\"},\n"
            + "    {\"key\":\"dataSupport\",\"label\":\"数据支撑\",\"score\":0-100,\"maxScore\":100,\"tone\":\"success|warning|danger\",\"level\":\"success|warning|danger\"},\n"
            + "    {\"key\":\"compliance\",\"label\":\"规范合规\",\"score\":0-100,\"maxScore\":100,\"tone\":\"success|warning|danger\",\"level\":\"success|warning|danger\"}\n"
            + "  ],\n"
            + "  \"seriousRisks\": [\"最多3条严重风险\"],\n"
            + "  \"severeRisks\": [\"与seriousRisks相同\"],\n"
            + "  \"riskSummary\": \"风险摘要\",\n"
            + "  \"suggestions\": [\n"
            + "    {\"index\":1,\"title\":\"建议标题\",\"detail\":\"具体怎么改\",\"content\":\"与detail相同\"}\n"
            + "  ],\n"
            + "  \"reconstructedExample\": \"必须是一个可 JSON.parse 的JSON字符串，字段名和层级必须严格等于：{\\\"productName\\\":\\\"产品名称，必填\\\",\\\"price\\\":\\\"产品价格，必填\\\",\\\"slogan\\\":\\\"产品Slogan，必填\\\",\\\"targetAudience\\\":\\\"目标人群，必填，可分号分组\\\",\\\"productFeatures\\\":\\\"产品特色卖点，必填，对应输入featureSellingPoint/targetScene，不得遗漏\\\",\\\"coreSellingPoints\\\":\\\"产品主要卖点，必填，对应输入primarySellingPoint，建议用1.2.3分点，不得遗漏\\\",\\\"secondarySellingPoints\\\":\\\"产品次要卖点，必填，对应输入secondarySellingPoint/otherRequirements，建议用1.2.3分点，不得遗漏\\\",\\\"usageScenarios\\\":\\\"使用场景，必填，至少3个可拍摄场景；如输入已有场景必须保留\\\",\\\"dataEvidence\\\":\\\"数据支撑，必填，只整理输入中已有数据；无来源的数据标注需补充来源，不得编造\\\",\\\"emotionalTag\\\":\\\"情绪标签，必填，一句人群情绪价值\\\",\\\"complianceNote\\\":\\\"合规提示，必填，指出绝对化/医疗化/功效承诺风险\\\"}\",\n"
            + "  \"optimizedExample\": \"与reconstructedExample相同\"\n"
            + "}\n"
            + "要求：分数必须按固定评分规则计算；建议必须指出具体字段如何补齐或改写；"
            + "reconstructedExample 必须保留输入中已有的产品名称、价格、Slogan、目标人群、产品特色卖点、产品主要卖点、产品次要卖点；"
            + "字段名只能使用 productName、price、slogan、targetAudience、productFeatures、coreSellingPoints、secondarySellingPoints、usageScenarios、dataEvidence、emotionalTag、complianceNote；"
            + "不要输出 Feature Selling Point、Core Selling Points、Secondary Selling Points 等英文展示标题；"
            + "如果某项输入为空，仍保留该字段并写明“待补充：具体需要补什么”。";
    }

    private BriefDetectionReportVO parseDetectionReport(String rawResponse) {
        String json = extractJsonObject(rawResponse);
        BriefDetectionReportVO report = JsonUtils.fromJson(json, BriefDetectionReportVO.class);
        if (report == null || report.totalScore == null || report.metrics == null || report.metrics.isEmpty()) {
            return null;
        }
        return report;
    }

    private String extractJsonObject(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return "";
        }
        String text = rawResponse.trim();
        if (text.startsWith("```")) {
            text = text.replaceFirst("^```(?:json)?", "").replaceFirst("```$", "").trim();
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return text.substring(start, end + 1);
        }
        return text;
    }

    private void normalizeDetectionReport(BriefDetectionReportVO report, AiBrief brief, BriefDetectDTO dto) {
        report.briefId = String.valueOf(brief.getId());
        report.briefName = firstNonBlank(report.briefName, dto == null ? null : dto.getProductName(), brief.getProductName(), brief.getBriefName(), "未命名产品");
        report.maxScore = report.maxScore == null ? 100 : report.maxScore;
        report.totalMaxScore = report.totalMaxScore == null ? report.maxScore : report.totalMaxScore;
        report.totalScore = clamp(report.totalScore == null ? 0 : report.totalScore, 0, report.maxScore);
        report.grade = firstNonBlank(report.grade, gradeFromScore(report.totalScore), "B");
        report.level = firstNonBlank(report.level, levelFromScore(report.totalScore), "warning");
        report.levelText = firstNonBlank(report.levelText, levelTextFromScore(report.totalScore), "可优化");
        report.summary = firstNonBlank(report.summary, "已完成产品 Brief 检测，并生成优化建议和重构示例。", "");
        report.metrics = normalizeMetrics(report.metrics);
        report.seriousRisks = report.seriousRisks == null ? List.of("暂无严重风险，建议继续补充数据支撑和合规描述。") : report.seriousRisks;
        report.severeRisks = report.severeRisks == null ? report.seriousRisks : report.severeRisks;
        report.riskSummary = firstNonBlank(report.riskSummary, "严重风险提示", "");
        report.suggestions = normalizeSuggestions(report.suggestions);
        report.reconstructedExample = firstNonBlank(report.reconstructedExample, report.optimizedExample, buildOptimizedExample(brief, dto));
        report.reconstructedExample = normalizeReconstructedExample(report.reconstructedExample, brief, dto);
        report.optimizedExample = firstNonBlank(report.optimizedExample, report.reconstructedExample, "");
        report.evaluatedAt = firstNonBlank(report.evaluatedAt, LocalDateTime.now().toString(), "");
    }

    private String normalizeReconstructedExample(String reconstructedExample, AiBrief brief, BriefDetectDTO dto) {
        Map<String, Object> parsed = parseObject(reconstructedExample);
        Map<String, String> normalized = new LinkedHashMap<>();
        normalized.put("productName", valueFrom(parsed, "productName", firstNonBlank(dto == null ? null : dto.getProductName(), brief.getProductName(), brief.getBriefName(), "待补充：产品名称")));
        normalized.put("price", valueFrom(parsed, "price", firstNonBlank(dto == null ? null : dto.getPrice(), brief.getPrice(), "待补充：产品价格")));
        normalized.put("slogan", valueFrom(parsed, "slogan", firstNonBlank(dto == null ? null : dto.getSlogan(), brief.getSlogan(), "待补充：产品 Slogan")));
        normalized.put("targetAudience", valueFrom(parsed, "targetAudience", firstNonBlank(dto == null ? null : dto.getTargetAudience(), brief.getTargetAudience(), "待补充：目标人群")));
        normalized.put("productFeatures", valueFrom(parsed, "productFeatures", firstNonBlank(dto == null ? null : dto.getFeatureSellingPoint(), dto == null ? null : dto.getTargetScene(), brief.getTargetScene(), "待补充：产品特色卖点")));
        normalized.put("coreSellingPoints", valueFrom(parsed, "coreSellingPoints", firstNonBlank(dto == null ? null : dto.getPrimarySellingPoint(), brief.getPrimarySellingPoint(), "待补充：产品主要卖点")));
        normalized.put("secondarySellingPoints", valueFrom(parsed, "secondarySellingPoints", firstNonBlank(dto == null ? null : dto.getSecondarySellingPoint(), brief.getOtherRequirements(), "待补充：产品次要卖点")));
        normalized.put("usageScenarios", valueFrom(parsed, "usageScenarios", firstNonBlank(dto == null ? null : dto.getTargetScene(), brief.getTargetScene(), "待补充：至少3个使用场景")));
        normalized.put("dataEvidence", valueFrom(parsed, "dataEvidence", "待补充：数据来源、认证依据、测试口径或第三方证明"));
        normalized.put("emotionalTag", valueFrom(parsed, "emotionalTag", "待补充：一句面向目标人群的情绪价值表达"));
        normalized.put("complianceNote", valueFrom(parsed, "complianceNote", "避免绝对化用语、医疗功效承诺和无依据数据表达"));
        return JsonUtils.toJson(normalized);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseObject(String content) {
        if (content == null || content.isBlank()) {
            return Map.of();
        }
        String json = extractJsonObject(content);
        try {
            Map<String, Object> parsed = JsonUtils.fromJson(json, Map.class);
            return parsed == null ? Map.of() : parsed;
        } catch (RuntimeException ex) {
            return Map.of();
        }
    }

    private String valueFrom(Map<String, Object> source, String key, String fallback) {
        Object value = source.get(key);
        if (value == null) {
            return fallback;
        }
        if (value instanceof String text) {
            return firstNonBlank(text, fallback);
        }
        return firstNonBlank(JsonUtils.toJson(value), fallback);
    }

    private List<BriefDetectionMetricVO> normalizeMetrics(List<BriefDetectionMetricVO> metrics) {
        List<BriefDetectionMetricVO> fallback = List.of(
            new BriefDetectionMetricVO("completeness", "完整性", 0, 100, "warning"),
            new BriefDetectionMetricVO("structure", "结构化", 0, 100, "warning"),
            new BriefDetectionMetricVO("painPoint", "场景痛点", 0, 100, "warning"),
            new BriefDetectionMetricVO("emotion", "情感价值", 0, 100, "warning"),
            new BriefDetectionMetricVO("dataSupport", "数据支撑", 0, 100, "warning"),
            new BriefDetectionMetricVO("compliance", "规范合规", 0, 100, "warning")
        );
        if (metrics == null || metrics.isEmpty()) {
            return fallback;
        }
        for (BriefDetectionMetricVO metric : metrics) {
            metric.maxScore = metric.maxScore == null ? 100 : metric.maxScore;
            metric.score = clamp(metric.score == null ? 0 : metric.score, 0, metric.maxScore);
            String tone = firstNonBlank(metric.tone, metric.level, toneFromScore(metric.score), "warning");
            metric.tone = tone;
            metric.level = tone;
        }
        return metrics;
    }

    private List<BriefDetectionSuggestionVO> normalizeSuggestions(List<BriefDetectionSuggestionVO> suggestions) {
        if (suggestions == null || suggestions.isEmpty()) {
            return List.of(new BriefDetectionSuggestionVO(1, "补全产品信息", "补充产品名称、价格、Slogan、目标人群、核心卖点和合规边界。"));
        }
        for (int i = 0; i < suggestions.size(); i++) {
            BriefDetectionSuggestionVO suggestion = suggestions.get(i);
            suggestion.index = suggestion.index == null ? i + 1 : suggestion.index;
            suggestion.detail = firstNonBlank(suggestion.detail, suggestion.content, "请补充具体优化内容。");
            suggestion.content = firstNonBlank(suggestion.content, suggestion.detail, "");
        }
        return suggestions;
    }

    private BriefDetectionReportVO buildMockDetectionReport(AiBrief brief, BriefDetectDTO dto) {
        BriefDetectionReportVO report = new BriefDetectionReportVO();
        report.briefId = String.valueOf(brief.getId());
        report.briefName = firstNonBlank(brief.getProductName(), brief.getBriefName(), "未命名产品");
        report.totalScore = 80;
        report.maxScore = 100;
        report.totalMaxScore = 100;
        report.grade = "A-";
        report.level = "excellent";
        report.levelText = "优秀（≥80）";
        report.summary = "Brief 结构基本完整，场景痛点和数据支撑较清晰；建议补齐核心 Slogan、价格与合规边界说明后进入脚本生成。";
        report.metrics = List.of(
            new BriefDetectionMetricVO("completeness", "完整性", 82, 100, "success"),
            new BriefDetectionMetricVO("structure", "结构化", 75, 100, "warning"),
            new BriefDetectionMetricVO("painPoint", "场景痛点", 95, 100, "success"),
            new BriefDetectionMetricVO("emotion", "情感价值", 80, 100, "success"),
            new BriefDetectionMetricVO("dataSupport", "数据支撑", 88, 100, "success"),
            new BriefDetectionMetricVO("compliance", "规范合规", 80, 100, "warning")
        );
        report.riskSummary = "严重风险提示";
        report.seriousRisks = List.of(
            "缺少数值：缺少核心 Slogan、产品价格；AI 话术及审核状态为空。",
            "逻辑警告：合规性需特别注意竞品痛点描述的合法合规边界。"
        );
        report.severeRisks = report.seriousRisks;
        report.suggestions = List.of(
            new BriefDetectionSuggestionVO(1, "结构优化建议", "将“特色卖点1”中的竞品缺点话术进行拔高，从“防摔”痛点直接引导到“平衡技术”的解决方案上，避免直接陈述劣质品缺点导致广告法风险。"),
            new BriefDetectionSuggestionVO(2, "内容补全建议", "必须补充【产品Slogan】（如“3分钟学会，天生好骑”）和【产品价格】（如“¥1999起”）。后续可根据右侧“用户场景”分别生成 3 组独立的视频脚本。")
        );
        report.optimizedExample = buildOptimizedExample(brief, dto);
        report.reconstructedExample = report.optimizedExample;
        return report;
    }

    private String buildOptimizedExample(AiBrief brief, BriefDetectDTO dto) {
        String productName = firstNonBlank(dto == null ? null : dto.getProductName(), brief.getProductName(), "九号平衡车");
        String slogan = firstNonBlank(dto == null ? null : dto.getSlogan(), brief.getSlogan(), "3分钟上手，天生好骑。");
        String audience = firstNonBlank(dto == null ? null : dto.getTargetAudience(), brief.getTargetAudience(), "校园师生、城市通勤党、短途骑手、摄影爱好者。");
        return "<核心Slogan> " + slogan + "\n"
            + "<产品名称> " + productName + "\n"
            + "<目标人群> " + audience + "\n"
            + "<特色卖点>\n"
            + "  • 告别发飘打转：自研动态自平衡 + Leansteer 遥控技术，新手也能指哪打哪。\n"
            + "  • 15重安全防护：防摔倒、防拎起误触、智能刹车，全场景保驾护航。\n"
            + "<核心卖点>\n"
            + "  • 22km超长续航：最高 25% 爬坡，10.5寸越野轮胎，无惧10cm坎。";
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return "";
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private String empty(String value) {
        return value == null ? "" : value;
    }

    private Integer clamp(Integer value, Integer min, Integer max) {
        return Math.max(min, Math.min(max, value));
    }

    private String gradeFromScore(Integer score) {
        if (score >= 90) {
            return "A";
        }
        if (score >= 80) {
            return "A-";
        }
        if (score >= 70) {
            return "B+";
        }
        if (score >= 60) {
            return "B";
        }
        return "C";
    }

    private String levelFromScore(Integer score) {
        if (score >= 80) {
            return "excellent";
        }
        if (score >= 70) {
            return "good";
        }
        if (score >= 60) {
            return "warning";
        }
        return "danger";
    }

    private String levelTextFromScore(Integer score) {
        if (score >= 80) {
            return "优秀（≥80）";
        }
        if (score >= 70) {
            return "良好（70-79）";
        }
        if (score >= 60) {
            return "需优化（60-69）";
        }
        return "风险较高（<60）";
    }

    private String toneFromScore(Integer score) {
        if (score >= 80) {
            return "success";
        }
        if (score >= 60) {
            return "warning";
        }
        return "danger";
    }
}
