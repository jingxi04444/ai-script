package com.aiscript.modules.script.convert;

import com.aiscript.modules.script.entity.AiScriptTemplate;
import com.aiscript.modules.script.vo.AdminScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptTemplateVO;
import com.aiscript.modules.script.vo.ScriptVO;
import com.aiscript.modules.storyboard.entity.AiStoryboardScript;

public final class ScriptConvert {
    private ScriptConvert() {
    }

    public static ScriptVO toScriptVO(AiStoryboardScript script) {
        ScriptVO vo = new ScriptVO();
        vo.setId(String.valueOf(script.getId()));
        vo.setName(script.getScriptName());
        vo.setProjectId(String.valueOf(script.getProjectId()));
        vo.setBriefId(script.getBriefId() == null ? null : String.valueOf(script.getBriefId()));
        vo.setType(script.getScriptType());
        vo.setDuration(script.getGenerationDuration());
        vo.setFormat(script.getGenerationFormat());
        vo.setFormatName(script.getGenerationFormatName());
        vo.setTemplateId(script.getGenerationTemplateId() == null ? null : String.valueOf(script.getGenerationTemplateId()));
        vo.setTemplateName(script.getGenerationTemplateName());
        vo.setOriginalCategoryId(script.getGenerationOriginalCategoryId());
        vo.setOriginalCategoryName(script.getGenerationOriginalCategoryName());
        vo.setOriginalScenarioId(script.getGenerationOriginalScenarioId());
        vo.setOriginalScenarioName(script.getGenerationOriginalScenarioName());
        vo.setStatus(normalizeStatus(script.getStatus()));
        vo.setContent(script.getContentText());
        vo.setCreatedAt(script.getCreateTime() == null ? null : script.getCreateTime().toString());
        vo.setUpdatedAt(script.getUpdateTime() == null ? null : script.getUpdateTime().toString());
        return vo;
    }

    private static String normalizeStatus(String status) {
        if ("pending".equals(status)) return "pending_review";
        if ("done".equals(status)) return "approved";
        return status;
    }

    public static ScriptTemplateVO toTemplateVO(AiScriptTemplate template) {
        ScriptTemplateVO vo = new ScriptTemplateVO();
        fillTemplateVO(vo, template);
        return vo;
    }

    public static AdminScriptTemplateVO toAdminTemplateVO(AiScriptTemplate template) {
        AdminScriptTemplateVO vo = new AdminScriptTemplateVO();
        fillTemplateVO(vo, template);
        vo.setReferenceUrl(template.getReferenceUrl());
        vo.setFullVideoUrl(template.getFullVideoUrl());
        return vo;
    }

    private static void fillTemplateVO(ScriptTemplateVO vo, AiScriptTemplate template) {
        vo.setId(String.valueOf(template.getId()));
        vo.setName(template.getTemplateName());
        vo.setCategory(template.getCategory());
        vo.setTemplateSource(template.getTemplateSource());
        vo.setActor(template.getActor());
        vo.setPeople(template.getPeople());
        vo.setPopularity(template.getPopularity());
        vo.setDifficulty(template.getDifficulty());
        vo.setParagraphStructure(template.getParagraphStructure());
        vo.setEmotionTurningPoints(template.getEmotionTurningPoints());
        vo.setFirstFiveSecondsHook(template.getFirstFiveSecondsHook());
        vo.setStructureFormula(template.getStructureFormula());
        vo.setFormulaExecutionChecklist(template.getFormulaExecutionChecklist());
        vo.setScriptTemplateLibrary(template.getScriptTemplateLibrary());
        vo.setReferenceDesc(template.getReferenceDesc());
        vo.setPreviewVideoUrl(template.getPreviewVideoUrl());
        vo.setSortOrder(template.getSortOrder());
        vo.setStatus(template.getStatus() != null && template.getStatus() == 1 ? "active" : "disabled");
        vo.setAuditStatus(template.getAuditStatus());
        vo.setPublishStatus(template.getPublishStatus());
        vo.setLocked(template.getLocked() != null && template.getLocked() == 1);
        vo.setCreatedAt(template.getCreateTime() == null ? null : template.getCreateTime().toString());
        vo.setUpdatedAt(template.getUpdateTime() == null ? null : template.getUpdateTime().toString());
    }
}
