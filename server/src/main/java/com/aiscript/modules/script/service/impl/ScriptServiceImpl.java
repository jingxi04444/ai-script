package com.aiscript.modules.script.service.impl;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.integration.llm.LlmClient;
import com.aiscript.modules.asset.entity.AiAsset;
import com.aiscript.modules.asset.mapper.AiAssetMapper;
import com.aiscript.modules.brief.entity.AiBrief;
import com.aiscript.modules.brief.mapper.AiBriefMapper;
import com.aiscript.modules.generation.entity.AiGenerationTask;
import com.aiscript.modules.generation.mapper.AiGenerationTaskMapper;
import com.aiscript.modules.script.convert.ScriptConvert;
import com.aiscript.modules.script.dto.GenerateScriptDTO;
import com.aiscript.modules.script.dto.PolishScriptDTO;
import com.aiscript.modules.script.dto.ScriptSaveDTO;
import com.aiscript.modules.script.dto.TemplateSaveDTO;
import com.aiscript.modules.script.dto.TemplateStateDTO;
import com.aiscript.modules.script.entity.AiScriptTemplate;
import com.aiscript.modules.script.mapper.AiScriptTemplateMapper;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.PolishScriptVO;
import com.aiscript.modules.script.vo.ScriptListVO;
import com.aiscript.modules.script.vo.ScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptVO;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;
import com.aiscript.modules.storyboard.entity.AiStoryboardShot;
import com.aiscript.modules.storyboard.entity.AiScriptVersion;
import com.aiscript.modules.storyboard.mapper.AiScriptVersionMapper;
import com.aiscript.modules.storyboard.mapper.AiStoryboardScriptMapper;
import com.aiscript.modules.storyboard.mapper.AiStoryboardShotMapper;
import com.aiscript.modules.system.entity.SysScriptFormatConfig;
import com.aiscript.modules.system.mapper.SysScriptFormatConfigMapper;
import com.aiscript.modules.system.service.PromptRenderService;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class ScriptServiceImpl implements ScriptService {
    private static final Integer DEFAULT_TENANT_ID = 1;

    private final AiStoryboardScriptMapper scriptMapper;
    private final AiScriptTemplateMapper templateMapper;
    private final AiScriptVersionMapper versionMapper;
    private final AiStoryboardShotMapper shotMapper;
    private final AiGenerationTaskMapper generationTaskMapper;
    private final AiBriefMapper briefMapper;
    private final AiAssetMapper assetMapper;
    private final SysScriptFormatConfigMapper scriptFormatMapper;
    private final LlmClient llmClient;
    private final PromptRenderService promptRenderService;
    private final MembershipEntitlementService entitlementService;

    public ScriptServiceImpl(
        AiStoryboardScriptMapper scriptMapper,
        AiScriptTemplateMapper templateMapper,
        AiScriptVersionMapper versionMapper,
        AiStoryboardShotMapper shotMapper,
        AiGenerationTaskMapper generationTaskMapper,
        AiBriefMapper briefMapper,
        AiAssetMapper assetMapper,
        SysScriptFormatConfigMapper scriptFormatMapper,
        LlmClient llmClient,
        PromptRenderService promptRenderService
        , MembershipEntitlementService entitlementService
    ) {
        this.scriptMapper = scriptMapper;
        this.templateMapper = templateMapper;
        this.versionMapper = versionMapper;
        this.shotMapper = shotMapper;
        this.generationTaskMapper = generationTaskMapper;
        this.briefMapper = briefMapper;
        this.assetMapper = assetMapper;
        this.scriptFormatMapper = scriptFormatMapper;
        this.llmClient = llmClient;
        this.promptRenderService = promptRenderService;
        this.entitlementService = entitlementService;
    }

    @Override
    public List<ScriptVO> list(Integer projectId) {
        return scriptMapper.selectList(new LambdaQueryWrapper<AiStoryboardScript>()
                .eq(AiStoryboardScript::getTenantId, currentTenantId())
                .eq(AiStoryboardScript::getCreateBy, currentUserId())
                .eq(AiStoryboardScript::getProjectId, projectId)
                .orderByDesc(AiStoryboardScript::getUpdateTime))
            .stream()
            .map(ScriptConvert::toScriptVO)
            .toList();
    }

    @Override
    public PageResult<ScriptListVO> page(PageQuery query, Integer projectId, String type, String status, String sortBy) {
        List<String> scriptTypes = StringUtils.hasText(type)
            ? Arrays.stream(type.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList()
            : List.of();
        String keyword = StringUtils.hasText(query.getKeyword()) ? query.getKeyword().trim() : null;
        String normalizedStatus = StringUtils.hasText(status) ? status.trim() : null;
        Page<ScriptListVO> page = new Page<>(query.getPage(), query.getPageSize());
        IPage<ScriptListVO> result = scriptMapper.selectScriptPage(
            page,
            currentTenantId(),
            currentUserId(),
            projectId,
            keyword,
            scriptTypes,
            normalizedStatus,
            "product".equals(sortBy) ? "product" : "updated"
        );
        return new PageResult<>(
            result.getRecords(),
            result.getTotal(),
            result.getCurrent(),
            result.getSize(),
            result.getPages()
        );
    }

    @Override
    public List<ScriptVO> mineList() {
        return scriptMapper.selectList(new LambdaQueryWrapper<AiStoryboardScript>()
                .eq(AiStoryboardScript::getTenantId, currentTenantId())
                .eq(AiStoryboardScript::getCreateBy, currentUserId())
                .orderByDesc(AiStoryboardScript::getUpdateTime))
            .stream()
            .map(ScriptConvert::toScriptVO)
            .toList();
    }

    @Override
    public ScriptVO getById(Integer id) {
        AiStoryboardScript script = ownedScript(id);
        return ScriptConvert.toScriptVO(script);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScriptVO generate(GenerateScriptDTO dto) {
        String operationId = StringUtils.hasText(dto.getRequestNo())
            ? dto.getRequestNo()
            : UUID.randomUUID().toString();
        String monthlyRequestNo = "script_generate:" + currentUserId() + ":" + operationId;
        String concurrencyRequestNo = "task_concurrency:script:" + currentUserId() + ":" + operationId;
        entitlementService.reserveQuota(
            currentTenantId(), currentUserId(), "TASK_CONCURRENCY_LIMIT", 1,
            concurrencyRequestNo, "script_generate", null
        );
        entitlementService.reserveQuota(
            currentTenantId(), currentUserId(), "SCRIPT_MONTHLY_LIMIT", 1,
            monthlyRequestNo, "script_generate", null
        );
        hydrateProductFrame(dto);
        AiGenerationTask task = createGenerationTask(dto);
        String generatedContent = generateContent(dto, task);
        AiStoryboardScript script = new AiStoryboardScript();
        script.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        script.setProjectId(Integer.valueOf(dto.getProjectId()));
        script.setScriptName(defaultScriptName(dto));
        script.setScriptType(StringUtils.hasText(dto.getType()) ? dto.getType() : "original");
        script.setStatus("draft");
        script.setAuditStatus("not_submitted");
        script.setContentText(generatedContent);
        script.setCreateBy(currentUserId());
        scriptMapper.insert(script);

        AiScriptVersion version = new AiScriptVersion();
        version.setTenantId(script.getTenantId());
        version.setScriptId(script.getId());
        version.setVersionNo(1);
        version.setVersionTitle(script.getScriptName());
        version.setContentSnapshot(JsonUtils.toJson(Map.of("content", script.getContentText())));
        version.setChangeNote("AI generate");
        versionMapper.insert(version);

        AiStoryboardShot shot = new AiStoryboardShot();
        shot.setTenantId(script.getTenantId());
        shot.setScriptVersionId(version.getId());
        shot.setShotNo(1);
        shot.setShotType("特写");
        shot.setSceneDescription("产品出现在画面中央，展示核心卖点");
        shot.setLineText("这是根据当前输入生成的第一条分镜台词");
        shot.setDurationSeconds(new BigDecimal("3"));
        shot.setSellingPointNote("突出主卖点");
        shot.setRiskLevel("low");
        shot.setSortOrder(1);
        shotMapper.insert(shot);

        script.setCurrentVersionId(version.getId());
        scriptMapper.updateById(script);
        task.setStatus("success");
        task.setProgress(100);
        task.setResultPayload(JsonUtils.toJson(Map.of("scriptId", String.valueOf(script.getId()), "versionId", String.valueOf(version.getId()))));
        task.setFinishTime(LocalDateTime.now());
        generationTaskMapper.updateById(task);
        entitlementService.confirmQuota(monthlyRequestNo);
        entitlementService.releaseQuota(concurrencyRequestNo);
        return ScriptConvert.toScriptVO(script);
    }

    @Override
    public PolishScriptVO polish(Integer id, PolishScriptDTO dto) {
        AiStoryboardScript script = ownedScript(id);
        hydrateProductFrame(dto);

        String sourceContent = StringUtils.hasText(dto.getContent()) ? dto.getContent().trim() : script.getContentText();
        if (!StringUtils.hasText(sourceContent)) {
            throw new BusinessException("原脚本内容为空，无法继续润色");
        }

        String instruction = dto.getInstruction().trim();
        AiBrief brief = null;
        if (StringUtils.hasText(dto.getBriefId())) {
            try {
                brief = briefMapper.selectOne(new LambdaQueryWrapper<AiBrief>()
                    .eq(AiBrief::getId, Integer.valueOf(dto.getBriefId()))
                    .eq(AiBrief::getTenantId, currentTenantId())
                    .last("LIMIT 1"));
            } catch (NumberFormatException ignored) {
                brief = null;
            }
        }
        String referenceContext = List.of(
            brief == null ? "" : "【本次重新调用的产品 Brief】\n" + buildProductInfo(brief),
            StringUtils.hasText(dto.getProductFrameFileName())
                ? "【本次引用的画面文件】\n文件名：" + dto.getProductFrameFileName()
                : "",
            StringUtils.hasText(dto.getProductFrameContent())
                ? "【画面 OCR / 表格解析文字】\n" + dto.getProductFrameContent()
                : "",
            StringUtils.hasText(dto.getProductImage()) && !StringUtils.hasText(dto.getProductFrameContent())
                ? "【画面文件说明】图片已上传，但未识别到可用文字。不要臆测图片中的物体、场景或卖点。"
                : ""
        ).stream().filter(StringUtils::hasText).reduce((a, b) -> a + "\n\n" + b).orElse("");
        Map<String, String> variables = new HashMap<>();
        variables.put("instruction", StringUtils.hasText(referenceContext)
            ? instruction + "\n\n" + referenceContext
            : instruction);
        variables.put("content", sourceContent);
        variables.put("referenceContext", referenceContext);
        PromptRenderService.RenderedPrompt renderedPrompt = promptRenderService.render(
            "script_polish",
            "你是专业商业短视频脚本编辑。请严格依据用户的修改要求，以及本次重新提供的产品 Brief、画面 OCR 文字或表格解析文字润色原脚本。用户要求重新选择卖点时，只能从 Brief 和已解析文字中的真实信息选择，不能推测图片里未提供的视觉内容。保持原脚本的输出格式和表格列结构，只输出修改后的完整脚本，不要解释修改过程，不要添加 Markdown 代码块。",
            "请按修改要求重写原脚本。\n\n【修改要求】\n{{instruction}}\n\n{{referenceContext}}\n\n【原脚本】\n{{content}}",
            variables
        );
        String polishedContent = llmClient.chat(renderedPrompt.getSystemPrompt(), renderedPrompt.getUserPrompt());
        if (!StringUtils.hasText(polishedContent) || "{}".equals(polishedContent.trim())) {
            throw new BusinessException("AI 未返回有效的润色内容，请稍后重试");
        }

        String summaryInstruction = instruction.length() > 60 ? instruction.substring(0, 60) + "…" : instruction;
        return new PolishScriptVO(polishedContent.trim(), "已根据修改要求完成润色：" + summaryInstruction);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScriptVO update(Integer id, ScriptSaveDTO dto) {
        AiStoryboardScript script = ownedScript(id);
        if (StringUtils.hasText(dto.getName())) {
            script.setScriptName(dto.getName());
        }
        if (StringUtils.hasText(dto.getType())) {
            script.setScriptType(dto.getType());
        }
        if (StringUtils.hasText(dto.getStatus())) {
            script.setStatus(dto.getStatus());
        }
        script.setContentText(dto.getContent());
        scriptMapper.updateById(script);
        return ScriptConvert.toScriptVO(script);
    }

    @Override
    public void delete(Integer id) {
        scriptMapper.deleteById(ownedScript(id).getId());
    }

    @Override
    public List<ScriptTemplateVO> enabledTemplates() {
        LambdaQueryWrapper<AiScriptTemplate> wrapper = baseEnabledTemplateQuery();
        String scope = entitlementService.getValue(currentTenantId(), currentUserId(), "TEMPLATE_ACCESS_SCOPE");
        if ("free_only".equals(scope)) {
            wrapper.eq(AiScriptTemplate::getLocked, 0).last("LIMIT 2");
        } else if (!entitlementService.hasFeature(currentTenantId(), currentUserId(), "HOT_TEMPLATE_ACCESS")) {
            wrapper.eq(AiScriptTemplate::getLocked, 0);
        }
        return templateMapper.selectList(wrapper).stream()
            .map(ScriptConvert::toTemplateVO)
            .toList();
    }
    @Override
    public PageResult<ScriptTemplateVO> templatePage(PageQuery query, String category) {
        LambdaQueryWrapper<AiScriptTemplate> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(query.getKeyword())) {
            wrapper.and(keywordWrapper -> keywordWrapper
                .like(AiScriptTemplate::getTemplateName, query.getKeyword())
                .or()
                .like(AiScriptTemplate::getTemplateSource, query.getKeyword())
                .or()
                .like(AiScriptTemplate::getDifficulty, query.getKeyword()));
        }
        if (StringUtils.hasText(category)) {
            wrapper.eq(AiScriptTemplate::getCategory, category);
        }
        wrapper.orderByAsc(AiScriptTemplate::getSortOrder)
            .orderByDesc(AiScriptTemplate::getUpdateTime)
            .orderByAsc(AiScriptTemplate::getId);
        IPage<AiScriptTemplate> page = templateMapper.selectPage(new Page<>(query.getPage(), query.getPageSize()), wrapper);
        List<ScriptTemplateVO> list = page.getRecords().stream().map(ScriptConvert::toTemplateVO).toList();
        return new PageResult<>(list, page.getTotal(), page.getCurrent(), page.getSize(), page.getPages());
    }

    @Override
    public ScriptTemplateVO templateById(Integer id) {
        AiScriptTemplate template = templateMapper.selectById(id);
        if (template == null) {
            throw new BusinessException("模板不存在");
        }
        return ScriptConvert.toTemplateVO(template);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScriptTemplateVO createTemplate(TemplateSaveDTO dto) {
        enforceCustomTemplateLimit(dto);
        AiScriptTemplate template = new AiScriptTemplate();
        fillTemplate(template, dto);
        template.setTenantId(currentTenantId());
        template.setAuditStatus("draft");
        template.setPublishStatus("offline");
        template.setStatus(0);
        templateMapper.insert(template);
        return ScriptConvert.toTemplateVO(template);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScriptTemplateVO updateTemplate(Integer id, TemplateSaveDTO dto) {
        AiScriptTemplate template = templateMapper.selectById(id);
        if (template == null) {
            throw new BusinessException("模板不存在");
        }
        fillTemplate(template, dto);
        templateMapper.updateById(template);
        return ScriptConvert.toTemplateVO(template);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ScriptTemplateVO updateTemplateState(Integer id, TemplateStateDTO dto) {
        AiScriptTemplate template = templateMapper.selectById(id);
        if (template == null) {
            throw new BusinessException("模板不存在");
        }
        if (StringUtils.hasText(dto.getAuditStatus())) {
            String auditStatus = dto.getAuditStatus();
            if (!List.of("draft", "running", "approved", "rejected").contains(auditStatus)) {
                throw new BusinessException("模板审核状态无效");
            }
            template.setAuditStatus(auditStatus);
            if (!"approved".equals(auditStatus)) {
                template.setPublishStatus("offline");
                template.setStatus(0);
            }
        }
        if (StringUtils.hasText(dto.getPublishStatus())) {
            String publishStatus = dto.getPublishStatus();
            if (!List.of("online", "offline").contains(publishStatus)) {
                throw new BusinessException("模板上下架状态无效");
            }
            if ("online".equals(publishStatus) && !"approved".equals(template.getAuditStatus())) {
                throw new BusinessException("模板审核通过后才能上架");
            }
            template.setPublishStatus(publishStatus);
            template.setStatus("online".equals(publishStatus) ? 1 : 0);
        }
        if (dto.getLocked() != null) {
            template.setLocked(Boolean.TRUE.equals(dto.getLocked()) ? 1 : 0);
        }
        templateMapper.updateById(template);
        return ScriptConvert.toTemplateVO(template);
    }

    @Override
    public void deleteTemplate(Integer id) {
        templateMapper.deleteById(id);
    }

    private String defaultScriptName(GenerateScriptDTO dto) {
        String productName = "未命名产品";
        if (StringUtils.hasText(dto.getBriefId())) {
            try {
                AiBrief brief = briefMapper.selectById(Integer.valueOf(dto.getBriefId()));
                if (brief != null && StringUtils.hasText(brief.getProductName())) {
                    productName = brief.getProductName().trim();
                }
            } catch (NumberFormatException ignored) {
                // 生成流程会在后续参数校验中返回明确错误，这里仅兜底脚本名。
            }
        }
        String tabName = switch (StringUtils.hasText(dto.getType()) ? dto.getType() : "original") {
            case "viral" -> "爆款复刻";
            case "template" -> "脚本模板库";
            default -> "AI原创";
        };
        String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        return productName + tabName + date;
    }

    private AiGenerationTask createGenerationTask(GenerateScriptDTO dto) {
        AiGenerationTask task = new AiGenerationTask();
        task.setTenantId(TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId());
        task.setProjectId(Integer.valueOf(dto.getProjectId()));
        task.setCreateBy(currentUserId());
        task.setTaskType("generate_script");
        task.setProviderCode("llm_default");
        task.setTaskLabel(defaultScriptName(dto));
        task.setStatus("running");
        task.setProgress(10);
        task.setInputPayload(JsonUtils.toJson(dto));
        task.setStartTime(LocalDateTime.now());
        generationTaskMapper.insert(task);
        return task;
    }

    private String generateContent(GenerateScriptDTO dto, AiGenerationTask task) {
        String userPrompt = StringUtils.hasText(dto.getPrompt()) ? dto.getPrompt() : "";
        AiBrief brief = findBrief(dto);
        String productInfo = buildProductInfo(brief);
        String templateText = templateInstruction(dto.getTemplateId());
        ScriptFormatInfo formatInfo = scriptFormatInfo(dto);
        Map<String, String> variables = new HashMap<>();
        variables.put("prompt", userPrompt);
        variables.put("userPrompt", userPrompt);
        variables.put("brief", productInfo);
        variables.put("productInfo", productInfo);
        variables.put("productName", brief == null ? "" : nullToEmpty(brief.getProductName()));
        variables.put("price", brief == null ? "" : nullToEmpty(brief.getPrice()));
        variables.put("slogan", brief == null ? "" : nullToEmpty(brief.getSlogan()));
        variables.put("primarySellingPoint", brief == null ? "" : nullToEmpty(brief.getPrimarySellingPoint()));
        variables.put("targetAudience", brief == null ? "" : nullToEmpty(brief.getTargetAudience()));
        variables.put("targetScene", brief == null ? "" : nullToEmpty(brief.getTargetScene()));
        variables.put("otherRequirements", brief == null ? "" : nullToEmpty(brief.getOtherRequirements()));
        variables.put("briefContent", brief == null ? "" : nullToEmpty(brief.getBriefContent()));
        variables.put("template", templateText);
        variables.put("type", dto.getType() == null ? "" : dto.getType());
        variables.put("duration", dto.getDuration() == null ? "" : dto.getDuration());
        variables.put("format", dto.getFormat() == null ? "" : dto.getFormat());
        variables.put("formatName", formatInfo.name());
        variables.put("formatRequirement", formatInfo.requirement());
        variables.put("referenceUrl", dto.getReferenceUrl() == null ? "" : dto.getReferenceUrl());
        variables.put("referenceCopy", dto.getReferenceCopy() == null ? "" : dto.getReferenceCopy());
        variables.put("structureAnalysis", dto.getStructureAnalysis() == null ? "" : dto.getStructureAnalysis());
        PromptRenderService.RenderedPrompt renderedPrompt = promptRenderService.render(
            scriptGenerateSceneCode(dto.getType()),
            "你是专业商业短视频脚本策划，只输出最终可拍摄脚本，不输出解释、假设、占位符或使用说明。上传图片只提供 OCR 识别文字，不代表已识别图片中的物体或场景；不得推测 OCR 文字之外的视觉信息。",
            "请根据下方内容信息，按平台配置的脚本生成规范输出最终脚本。不要输出解释、变量说明、假设说明或占位符。",
            variables
        );
        String contentContext = buildScriptContentContext(dto, productInfo, templateText, userPrompt, formatInfo);
        String modelUserPrompt = renderedPrompt.getUserPrompt() + "\n\n【本次生成内容信息】\n" + contentContext;
        try {
            String content = llmClient.chat(renderedPrompt.getSystemPrompt(), modelUserPrompt);
            if (StringUtils.hasText(content) && !"{}".equals(content.trim())) {
                return content;
            }
            return "【AI脚本草稿】" + (StringUtils.hasText(productInfo) ? productInfo : userPrompt) + "\n镜头1：产品核心卖点开场，引出用户痛点。\n镜头2：展示使用场景和利益点。\n镜头3：用行动号召收束。";
        } catch (RuntimeException ex) {
            task.setErrorCode("LLM_FALLBACK");
            task.setErrorMessage(ex.getMessage());
            generationTaskMapper.updateById(task);
            return fallbackScriptContent(dto, StringUtils.hasText(productInfo) ? productInfo : userPrompt);
        }
    }

    private String scriptGenerateSceneCode(String type) {
        return switch (StringUtils.hasText(type) ? type : "original") {
            case "viral" -> "script_generate_viral";
            case "template" -> "script_generate_template";
            default -> "script_generate_original";
        };
    }

    private AiBrief findBrief(GenerateScriptDTO dto) {
        if (!StringUtils.hasText(dto.getBriefId())) {
            throw new BusinessException("请先选择产品 Brief 后再生成脚本");
        }
        try {
            AiBrief brief = briefMapper.selectAccessibleProjectBrief(
                Integer.valueOf(dto.getBriefId()),
                Integer.valueOf(dto.getProjectId()),
                currentUserId(),
                currentTenantId()
            );
            if (brief == null) {
                throw new BusinessException("所选产品 Brief 不属于当前项目，请重新选择产品");
            }
            return brief;
        } catch (NumberFormatException ex) {
            throw new BusinessException("产品 Brief 参数错误");
        }
    }

    private AiStoryboardScript ownedScript(Integer id) {
        AiStoryboardScript script = scriptMapper.selectOne(new LambdaQueryWrapper<AiStoryboardScript>()
            .eq(AiStoryboardScript::getId, id)
            .eq(AiStoryboardScript::getTenantId, currentTenantId())
            .eq(AiStoryboardScript::getCreateBy, currentUserId())
            .last("LIMIT 1"));
        if (script == null) {
            throw new BusinessException("脚本不存在或无权操作");
        }
        return script;
    }

    private Integer currentTenantId() {
        return TenantContext.getTenantId() == null ? DEFAULT_TENANT_ID : TenantContext.getTenantId();
    }

    private Integer currentUserId() {
        return currentUser().getUserId();
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException("请先登录");
        }
        return loginUser;
    }

    private String buildScriptContentContext(GenerateScriptDTO dto, String productInfo, String templateText, String userPrompt, ScriptFormatInfo formatInfo) {
        if ("viral".equals(dto.getType())) {
            return List.of(
                "生成任务：根据我提供的拆解结果文案和文案结构分析，用我选择的产品信息，按照拆解文案的风格和结构进行复刻，生成新的商业短视频脚本。",
                "产品信息：\n" + nullToEmpty(productInfo),
                "拆解结果文案：\n" + nullToEmpty(dto.getReferenceCopy()),
                "文案结构分析：\n" + nullToEmpty(dto.getStructureAnalysis()),
                "脚本格式：" + formatInfo.name(),
                "脚本格式要求：\n" + formatInfo.requirement(),
                "脚本时长：" + nullToEmpty(dto.getDuration()),
                "上传画面文件：" + nullToEmpty(dto.getProductFrameFileName()),
                "上传画面 OCR / 表格解析文字：\n" + nullToEmpty(dto.getProductFrameContent()),
                "用户补充要求：\n" + nullToEmpty(userPrompt)
            ).stream().filter(line -> !line.endsWith("：\n") && !line.endsWith("：")).toList().stream().reduce((a, b) -> a + "\n\n" + b).orElse("");
        }
        String promptLabel = "original".equals(dto.getType()) ? "用户提示词" : "用户补充要求";
        return List.of(
            promptLabel + "：\n" + nullToEmpty(userPrompt),
            "产品 Brief：\n" + nullToEmpty(productInfo),
            "脚本类型：" + nullToEmpty(dto.getType()),
            "脚本格式：" + formatInfo.name(),
            "脚本格式要求：\n" + formatInfo.requirement(),
            "脚本时长：" + nullToEmpty(dto.getDuration()),
            "上传画面文件：" + nullToEmpty(dto.getProductFrameFileName()),
            "上传画面 OCR / 表格解析文字：\n" + nullToEmpty(dto.getProductFrameContent()),
            "模板信息：\n" + nullToEmpty(templateText),
            "参考链接：" + nullToEmpty(dto.getReferenceUrl()),
            "参考视频文案：\n" + nullToEmpty(dto.getReferenceCopy()),
            "结构分析：\n" + nullToEmpty(dto.getStructureAnalysis())
        ).stream().filter(line -> !line.endsWith("：\n") && !line.endsWith("：")).toList().stream().reduce((a, b) -> a + "\n\n" + b).orElse("");
    }

    private String buildProductInfo(AiBrief brief) {
        if (brief == null) {
            return "";
        }
        return List.of(
            "产品名称：" + nullToEmpty(brief.getProductName()),
            "Brief 名称：" + nullToEmpty(brief.getBriefName()),
            "产品型号：" + nullToEmpty(brief.getProductModel()),
            "价格：" + nullToEmpty(brief.getPrice()),
            "Slogan：" + nullToEmpty(brief.getSlogan()),
            "核心卖点：" + nullToEmpty(brief.getPrimarySellingPoint()),
            "目标人群：" + nullToEmpty(brief.getTargetAudience()),
            "目标场景：" + nullToEmpty(brief.getTargetScene()),
            "其他要求：" + nullToEmpty(brief.getOtherRequirements()),
            "完整 Brief：" + nullToEmpty(brief.getBriefContent())
        ).stream().filter(line -> !line.endsWith("：")).toList().stream().reduce((a, b) -> a + "\n" + b).orElse("");
    }

    private void hydrateProductFrame(GenerateScriptDTO dto) {
        ProductFrameReference reference = productFrameReference(dto.getProductFrameAssetId());
        if (reference == null) {
            return;
        }
        dto.setProductFrameFileName(reference.fileName());
        dto.setProductFrameContent(reference.extractedText());
        dto.setProductImage(reference.previewUrl());
        dto.setProductFrame(reference.previewUrl());
    }

    private void hydrateProductFrame(PolishScriptDTO dto) {
        ProductFrameReference reference = productFrameReference(dto.getProductFrameAssetId());
        if (reference == null) {
            return;
        }
        dto.setProductFrameFileName(reference.fileName());
        dto.setProductFrameContent(reference.extractedText());
        dto.setProductImage(reference.previewUrl());
    }

    private ProductFrameReference productFrameReference(String assetId) {
        if (!StringUtils.hasText(assetId)) {
            return null;
        }
        final Integer parsedAssetId;
        try {
            parsedAssetId = Integer.valueOf(assetId);
        } catch (NumberFormatException ex) {
            throw new BusinessException("产品画面资产参数错误");
        }
        AiAsset asset = assetMapper.selectOne(new LambdaQueryWrapper<AiAsset>()
            .eq(AiAsset::getId, parsedAssetId)
            .eq(AiAsset::getTenantId, currentTenantId())
            .eq(AiAsset::getOwnerId, currentUserId())
            .eq(AiAsset::getCategory, "product-frame-library")
            .last("LIMIT 1"));
        if (asset == null) {
            throw new BusinessException("产品画面资产不存在或无权使用");
        }
        Object extractedText = JsonUtils.toMap(asset.getMetadataJson()).get("extractedText");
        asset.setUsageCount((asset.getUsageCount() == null ? 0 : asset.getUsageCount()) + 1);
        assetMapper.updateById(asset);
        return new ProductFrameReference(
            asset.getAssetName(),
            extractedText instanceof String text ? text : "",
            asset.getPreviewUrl()
        );
    }

    private record ProductFrameReference(String fileName, String extractedText, String previewUrl) {
    }

    private String templateInstruction(String templateId) {
        if (!StringUtils.hasText(templateId)) {
            return "模板要求：无指定模板，按标准短视频分镜脚本生成。";
        }
        try {
            AiScriptTemplate template = templateMapper.selectById(Integer.valueOf(templateId));
            if (template == null) {
                return "模板要求：按标准短视频分镜脚本生成。";
            }
            if (!"approved".equals(template.getAuditStatus()) || !"online".equals(template.getPublishStatus())) {
                throw new BusinessException("该模板尚未审核通过或已下架");
            }
            ensureTemplateAccess(template);
            return "模板要求：参考模板《" + template.getTemplateName() + "》；分类：" + nullToEmpty(template.getCategory())
                + "；适用演员/账号：" + nullToEmpty(template.getActor())
                + "；适用人群：" + nullToEmpty(template.getPeople())
                + "；难度：" + nullToEmpty(template.getDifficulty()) + "。"
                + "\n段落结构拆解：" + nullToEmpty(template.getParagraphStructure())
                + "\n情绪转折点：" + nullToEmpty(template.getEmotionTurningPoints())
                + "\n前5秒钩子话术提炼：" + nullToEmpty(template.getFirstFiveSecondsHook())
                + "\n结构模型公式：" + nullToEmpty(template.getStructureFormula())
                + "\n脚本模版库提示词：" + nullToEmpty(template.getScriptTemplateLibrary())
                + "\n参考链接：" + nullToEmpty(template.getReferenceUrl())
                + "\n参考说明：" + nullToEmpty(template.getReferenceDesc());
        } catch (NumberFormatException ex) {
            return "模板要求：按标准短视频分镜脚本生成。";
        }
    }

    private void ensureTemplateAccess(AiScriptTemplate template) {
        if (template.getLocked() != null && template.getLocked() == 1) {
            entitlementService.requireFeature(currentTenantId(), currentUserId(), "HOT_TEMPLATE_ACCESS");
        }
        String scope = entitlementService.getValue(currentTenantId(), currentUserId(), "TEMPLATE_ACCESS_SCOPE");
        if (!"free_only".equals(scope)) {
            return;
        }
        boolean freeTemplate = templateMapper.selectList(baseEnabledTemplateQuery()
                .eq(AiScriptTemplate::getLocked, 0)
                .last("LIMIT 2"))
            .stream()
            .anyMatch(item -> item.getId().equals(template.getId()));
        if (!freeTemplate) {
            throw new BusinessException("免费体验版仅可使用 2 个免费模板");
        }
    }

    private LambdaQueryWrapper<AiScriptTemplate> baseEnabledTemplateQuery() {
        return new LambdaQueryWrapper<AiScriptTemplate>()
            .eq(AiScriptTemplate::getStatus, 1)
            .eq(AiScriptTemplate::getAuditStatus, "approved")
            .eq(AiScriptTemplate::getPublishStatus, "online")
            .orderByAsc(AiScriptTemplate::getSortOrder)
            .orderByDesc(AiScriptTemplate::getUpdateTime)
            .orderByAsc(AiScriptTemplate::getId);
    }
    private ScriptFormatInfo scriptFormatInfo(GenerateScriptDTO dto) {
        String format = dto.getFormat();
        if (StringUtils.hasText(format)) {
            SysScriptFormatConfig config = scriptFormatMapper.selectOne(new QueryWrapper<SysScriptFormatConfig>()
                .eq("code", format)
                .eq("status", 1)
                .last("limit 1"));
            if (config != null) {
                return new ScriptFormatInfo(
                    StringUtils.hasText(config.name) ? config.name : displayFormat(format),
                    StringUtils.hasText(config.formatRequirement) ? config.formatRequirement : nullToEmpty(dto.getFormatRequirement())
                );
            }
        }
        return new ScriptFormatInfo(displayFormat(format), nullToEmpty(dto.getFormatRequirement()));
    }

    private String displayFormat(String format) {
        if ("oral".equals(format)) {
            return "口播脚本";
        }
        if ("shot".equals(format)) {
            return "拍摄脚本";
        }
        return "分镜脚本表";
    }

    private record ScriptFormatInfo(String name, String requirement) {
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String fallbackScriptContent(GenerateScriptDTO dto, String prompt) {
        String duration = StringUtils.hasText(dto.getDuration()) ? dto.getDuration() : "30s";
        ScriptFormatInfo formatInfo = scriptFormatInfo(dto);
        return "【AI脚本草稿】\n"
            + "脚本时长：" + duration + "\n"
            + "脚本格式：" + formatInfo.name() + "\n"
            + "脚本格式要求：" + formatInfo.requirement() + "\n"
            + ("original".equals(dto.getType()) ? "用户提示词：" : "创作需求：") + prompt + "\n\n"
            + "开场钩子：别再用普通方式介绍产品了，先让用户看到真实痛点。\n"
            + "痛点共鸣：把目标人群每天都会遇到的麻烦说清楚，让用户产生代入感。\n"
            + "卖点展开：围绕核心卖点给出具体场景，展示产品如何解决问题。\n"
            + "信任证明：补充使用反馈、效果变化或对比细节，降低用户决策顾虑。\n"
            + "行动引导：用一句明确的利益点收尾，引导点击、咨询或下单。";
    }

    private void fillTemplate(AiScriptTemplate template, TemplateSaveDTO dto) {
        template.setTemplateName(dto.getName());
        template.setCategory(dto.getCategory());
        template.setTemplateSource(dto.getTemplateSource());
        template.setActor(dto.getActor());
        template.setPeople(dto.getPeople());
        template.setPopularity(dto.getPopularity());
        template.setDifficulty(dto.getDifficulty());
        template.setParagraphStructure(dto.getParagraphStructure());
        template.setEmotionTurningPoints(dto.getEmotionTurningPoints());
        template.setFirstFiveSecondsHook(dto.getFirstFiveSecondsHook());
        template.setStructureFormula(dto.getStructureFormula());
        template.setScriptTemplateLibrary(dto.getScriptTemplateLibrary());
        template.setReferenceUrl(dto.getReferenceUrl());
        template.setReferenceDesc(dto.getReferenceDesc());
        template.setSortOrder(dto.getSortOrder() == null ? 0 : dto.getSortOrder());
        if (dto.getLocked() != null || template.getLocked() == null) {
            template.setLocked(Boolean.TRUE.equals(dto.getLocked()) ? 1 : 0);
        }
    }

    private void enforceCustomTemplateLimit(TemplateSaveDTO dto) {
        LoginUser user = currentUser();
        if ("admin".equals(user.getUserType()) && isPlatformTemplate(dto)) {
            return;
        }
        long limit = entitlementService.getLimit(currentTenantId(), currentUserId(), "CUSTOM_TEMPLATE_LIMIT");
        if (limit < 0) {
            return;
        }
        Long existing = templateMapper.selectCount(new LambdaQueryWrapper<AiScriptTemplate>()
            .eq(AiScriptTemplate::getTenantId, currentTenantId())
            .eq(AiScriptTemplate::getCreateBy, currentUserId()));
        if (existing != null && existing >= limit) {
            throw new BusinessException("自定义模板保存数量已达当前会员套餐上限");
        }
    }

    private boolean isPlatformTemplate(TemplateSaveDTO dto) {
        return dto == null || !StringUtils.hasText(dto.getTemplateSource()) || "平台模板".equals(dto.getTemplateSource().trim());
    }
}
