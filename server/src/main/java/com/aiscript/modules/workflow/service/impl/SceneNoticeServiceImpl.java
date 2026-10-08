package com.aiscript.modules.workflow.service.impl;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.common.util.JsonUtils;
import com.aiscript.framework.tenant.TenantContext;
import com.aiscript.modules.brief.service.BriefService;
import com.aiscript.modules.brief.vo.BriefVO;
import com.aiscript.modules.script.service.ScriptReviewService;
import com.aiscript.modules.script.service.ScriptService;
import com.aiscript.modules.script.vo.ScriptVO;
import com.aiscript.modules.workflow.dto.SceneNoticeSaveDTO;
import com.aiscript.modules.workflow.entity.AiSceneNoticePlan;
import com.aiscript.modules.workflow.mapper.AiSceneNoticePlanMapper;
import com.aiscript.modules.workflow.service.SceneNoticeService;
import com.aiscript.modules.workflow.vo.SceneNoticeVO;
import com.aiscript.security.LoginUser;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class SceneNoticeServiceImpl implements SceneNoticeService {
    private final AiSceneNoticePlanMapper mapper;
    private final BriefService briefService;
    private final ScriptService scriptService;
    private final ScriptReviewService accessService;
    private final ObjectMapper objectMapper;

    public SceneNoticeServiceImpl(AiSceneNoticePlanMapper mapper, BriefService briefService,
                                  ScriptService scriptService, ScriptReviewService accessService,
                                  ObjectMapper objectMapper) {
        this.mapper = mapper;
        this.briefService = briefService;
        this.scriptService = scriptService;
        this.accessService = accessService;
        this.objectMapper = objectMapper;
    }

    @Override
    public SceneNoticeVO get(Integer projectId) {
        accessService.internalAccessForProject(projectId);
        AiSceneNoticePlan saved = find(projectId, currentUser());
        return saved == null ? null : toVO(saved);
    }

    @Override
    public SceneNoticeVO preview(Integer projectId, SceneNoticeSaveDTO dto) {
        accessService.internalAccessForProject(projectId);
        SceneNoticeVO result = new SceneNoticeVO();
        result.setProjectId(String.valueOf(projectId));
        result.setDraft(dto);
        result.setPlan(objectMapper.valueToTree(buildPlan(projectId, dto)));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SceneNoticeVO save(Integer projectId, SceneNoticeSaveDTO dto) {
        accessService.internalAccessForProject(projectId);
        Map<String, Object> plan = buildPlan(projectId, dto);
        LoginUser user = currentUser();
        AiSceneNoticePlan saved = find(projectId, user);
        if (saved == null) {
            saved = new AiSceneNoticePlan();
            saved.setProjectId(projectId);
            saved.setTenantId(tenantId(user));
            saved.setCreateBy(user.getUserId());
            saved.setVersion(1);
        } else {
            saved.setVersion(saved.getVersion() + 1);
        }
        saved.setDraftJson(JsonUtils.toJson(dto));
        saved.setPlanJson(JsonUtils.toJson(plan));
        saved.setUpdateBy(user.getUserId());
        if (saved.getId() == null) mapper.insert(saved); else mapper.updateById(saved);
        return toVO(saved);
    }

    private Map<String, Object> buildPlan(Integer projectId, SceneNoticeSaveDTO dto) {
        if (dto == null || dto.getPerSceneCap() == null || dto.getPerSceneCap() < 1 || dto.getPerSceneCap() > 100)
            throw new BusinessException("单场景单型号上限须为 1–100 条");
        if (dto.getSceneCount() == null || dto.getSceneCount() < 1 || dto.getSceneCount() > 20)
            throw new BusinessException("场景数量须为 1–20 个");
        if (dto.getScenes() != null && dto.getScenes().size() > 20) throw new BusinessException("场景数量超过上限");
        Map<String, Integer> imageCounts = dto.getAiImageCounts() == null ? Map.of() : dto.getAiImageCounts();
        if (imageCounts.size() > 2000 || imageCounts.values().stream().anyMatch(value -> value == null || value < 0 || value > 10000))
            throw new BusinessException("AI 生图张数须为 0–10000 的整数");
        Map<String, String> notes = dto.getRowNotes() == null ? Map.of() : dto.getRowNotes();
        if (notes.size() > 2000 || notes.values().stream().anyMatch(value -> value != null && value.length() > 2000))
            throw new BusinessException("通告表备注过长");

        List<BriefVO> briefs = briefService.list(projectId);
        List<ScriptVO> scripts = scriptService.list(projectId);
        Map<String, Integer> scriptCounts = new HashMap<>();
        scripts.forEach(script -> scriptCounts.merge(String.valueOf(script.getBriefId()), 1, Integer::sum));
        List<Map<String, Object>> models = new ArrayList<>();
        for (BriefVO brief : briefs) {
            String name = StringUtils.hasText(brief.getProductModel()) ? brief.getProductModel().trim()
                : StringUtils.hasText(brief.getProductName()) ? brief.getProductName().trim() : brief.getName();
            String productName = StringUtils.hasText(brief.getProductName()) ? brief.getProductName().trim() : name;
            int count = scriptCounts.getOrDefault(brief.getId(), 0);
            models.add(model("brief-" + brief.getId(), name, productName, brief.getId(), count));
        }
        int unlinked = scripts.size() - briefs.stream().mapToInt(brief -> scriptCounts.getOrDefault(brief.getId(), 0)).sum();
        if (unlinked > 0) models.add(model("unlinked-scripts", "未关联型号", "未关联 Brief 的脚本", "", unlinked));
        List<SceneNoticeSaveDTO.ManualModelDTO> manual = dto.getManualModels() == null ? List.of() : dto.getManualModels();
        if (manual.size() > 30) throw new BusinessException("临时产品最多 30 个");
        for (SceneNoticeSaveDTO.ManualModelDTO item : manual) {
            if (item == null || !StringUtils.hasText(item.getId())
                || !(item.getId().startsWith("manual-") || item.getId().startsWith("model-"))
                || !StringUtils.hasText(item.getName()) || item.getName().length() > 120
                || item.getTargetCount() == null || item.getTargetCount() < 0 || item.getTargetCount() > 10000)
                throw new BusinessException("临时产品名称或脚本数量无效");
            models.add(model(item.getId(), item.getName().trim(), item.getName().trim(), "", item.getTargetCount()));
        }
        if (models.size() > 50 || models.stream().map(model -> model.get("id")).distinct().count() != models.size())
            throw new BusinessException("产品型号过多或标识重复，最多支持 50 个型号");
        if (models.isEmpty()) throw new BusinessException("当前项目尚无产品 Brief 或临时产品");
        int sceneCount = dto.getSceneCount();
        int cap = dto.getPerSceneCap();
        int minimumScenes = models.stream().mapToInt(model -> ((int) model.get("targetCount") + cap - 1) / cap).max().orElse(0);
        if (sceneCount < minimumScenes) throw new BusinessException("按每场每型号最多 " + cap + " 条，至少需要 " + minimumScenes + " 个场景");
        int[] totals = new int[sceneCount];
        Map<String, int[]> allocations = new LinkedHashMap<>();
        for (Map<String, Object> model : models) {
            int target = (int) model.get("targetCount");
            int[] counts = new int[sceneCount];
            for (int index = 0; index < sceneCount; index++) { counts[index] = target / sceneCount; totals[index] += counts[index]; }
            for (int extra = 0; extra < target % sceneCount; extra++) {
                int best = 0;
                for (int index = 1; index < sceneCount; index++) if (totals[index] < totals[best]) best = index;
                counts[best]++; totals[best]++;
            }
            allocations.put((String) model.get("id"), counts);
        }
        List<Map<String, Object>> scenes = new ArrayList<>();
        int totalImages = 0;
        for (int index = 0; index < sceneCount; index++) {
            SceneNoticeSaveDTO.SceneSettingDTO setting = dto.getScenes() != null && index < dto.getScenes().size() ? dto.getScenes().get(index) : null;
            String sceneName = setting != null && StringUtils.hasText(setting.getName()) ? setting.getName().trim() : "场景 " + (index + 1);
            if (sceneName.length() > 120) throw new BusinessException("场景名称过长");
            List<Map<String, Object>> assignments = new ArrayList<>();
            for (Map<String, Object> model : models) {
                String key = "S" + (index + 1) + "-" + model.get("id");
                int count = Objects.requireNonNull(allocations.get(model.get("id")))[index];
                int images = imageCounts.getOrDefault(key, Math.max(1, count));
                totalImages += images;
                Map<String, Object> assignment = new LinkedHashMap<>(model);
                assignment.put("count", count);
                assignment.put("aiImageCount", images);
                assignment.put("note", notes.getOrDefault(key, ""));
                assignment.put("productAssetKey", key);
                assignments.add(assignment);
            }
            Map<String, Object> scene = new LinkedHashMap<>();
            scene.put("id", "scene-" + (index + 1)); scene.put("number", index + 1);
            scene.put("name", sceneName); scene.put("imageUrl", setting == null ? "" : setting.getImageUrl());
            scene.put("note", setting == null ? "" : setting.getNote());
            scene.put("totalCount", totals[index]); scene.put("blankAssetKey", "S" + (index + 1) + "-blank");
            scene.put("assignments", assignments);
            scenes.add(scene);
        }
        int totalScripts = models.stream().mapToInt(model -> (int) model.get("targetCount")).sum();
        int baselineImages = totalScripts * 2;
        int plannedImages = sceneCount + sceneCount * models.size();
        Map<String, Object> plan = new LinkedHashMap<>();
        plan.put("scenes", scenes); plan.put("models", models);
        plan.put("totalScripts", totalScripts); plan.put("minimumScenes", minimumScenes);
        plan.put("blankAssets", sceneCount); plan.put("productAssets", sceneCount * models.size());
        plan.put("baselineImages", baselineImages); plan.put("plannedImages", plannedImages);
        plan.put("reusedImages", Math.max(0, baselineImages - plannedImages)); plan.put("totalAiImages", totalImages);
        return plan;
    }

    private Map<String, Object> model(String id, String name, String productName, String briefId, int count) {
        Map<String, Object> model = new LinkedHashMap<>();
        model.put("id", id); model.put("modelId", id); model.put("name", name); model.put("modelName", name);
        model.put("productName", productName); model.put("briefId", briefId);
        model.put("targetCount", count); model.put("sourceCount", count);
        return model;
    }

    private AiSceneNoticePlan find(Integer projectId, LoginUser user) {
        return mapper.selectOne(Wrappers.<AiSceneNoticePlan>lambdaQuery()
            .eq(AiSceneNoticePlan::getTenantId, tenantId(user))
            .eq(AiSceneNoticePlan::getProjectId, projectId)
            .eq(AiSceneNoticePlan::getCreateBy, user.getUserId()).last("LIMIT 1"));
    }

    private SceneNoticeVO toVO(AiSceneNoticePlan saved) {
        SceneNoticeVO vo = new SceneNoticeVO();
        vo.setId(String.valueOf(saved.getId())); vo.setProjectId(String.valueOf(saved.getProjectId()));
        vo.setVersion(saved.getVersion());
        vo.setDraft(JsonUtils.fromJson(saved.getDraftJson(), SceneNoticeSaveDTO.class));
        try { vo.setPlan(objectMapper.readTree(saved.getPlanJson())); }
        catch (JsonProcessingException error) { throw new IllegalStateException("场景通告图数据损坏", error); }
        vo.setUpdatedAt(saved.getUpdateTime() == null ? null : saved.getUpdateTime().toString());
        return vo;
    }

    private LoginUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof LoginUser user)) throw new BusinessException("请先登录");
        return user;
    }

    private Integer tenantId(LoginUser user) {
        return TenantContext.getTenantId() == null ? user.getTenantId() : TenantContext.getTenantId();
    }
}
