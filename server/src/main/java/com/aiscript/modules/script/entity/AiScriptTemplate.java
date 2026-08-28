package com.aiscript.modules.script.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.EqualsAndHashCode;

@TableName("ai_script_template")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiScriptTemplate extends TenantBaseEntity {
    private String templateName;
    private String category;
    private String templateSource;
    private String actor;
    private String people;
    private String popularity;
    private String difficulty;
    private String paragraphStructure;
    private String emotionTurningPoints;
    private String firstFiveSecondsHook;
    private String structureFormula;
    private String formulaExecutionChecklist;
    private String scriptTemplateLibrary;
    private String referenceUrl;
    private String referenceDesc;
    private String previewVideoUrl;
    private String fullVideoUrl;
    private Integer sortOrder;
    private Integer locked;
    private Integer status;
    private String auditStatus;
    private String publishStatus;
}
