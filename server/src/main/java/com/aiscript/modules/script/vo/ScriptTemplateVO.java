package com.aiscript.modules.script.vo;

import lombok.Data;

@Data
public class ScriptTemplateVO {
    private String id;
    private String name;
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
    private String referenceDesc;
    private String previewVideoUrl;
    private Integer sortOrder;
    private String status;
    private String auditStatus;
    private String publishStatus;
    private Boolean locked;
    private String createdAt;
    private String updatedAt;
}
