package com.aiscript.modules.workflow.dto;

import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class SceneNoticeSaveDTO {
    private Integer perSceneCap;
    private Integer sceneCount;
    private List<SceneSettingDTO> scenes;
    private List<ManualModelDTO> manualModels;
    private Map<String, Integer> aiImageCounts;
    private Map<String, String> rowNotes;
    private String shootDate;
    private String coordinator;
    private String photographer;
    private String actor;

    @Data
    public static class SceneSettingDTO {
        private String name;
        private String imageUrl;
        private String note;
    }

    @Data
    public static class ManualModelDTO {
        private String id;
        private String name;
        private Integer targetCount;
    }
}
