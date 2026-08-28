package com.aiscript.modules.script.dto;

import lombok.Data;

@Data
public class TemplateSaveDTO {
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
    private String referenceUrl;
    private String referenceDesc;
    private String previewVideoUrl;
    private String fullVideoUrl;
    private Integer sortOrder;
    private String status;
    private Boolean locked;
}
