package com.aiscript.modules.workflow.vo;

import com.aiscript.modules.workflow.dto.SceneNoticeSaveDTO;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class SceneNoticeVO {
    private String id;
    private String projectId;
    private Integer version;
    private SceneNoticeSaveDTO draft;
    private JsonNode plan;
    private String updatedAt;
}
