package com.aiscript.modules.generation.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ScriptQueueItemVO {
    private String id;
    private String projectId;
    private String batchNo;
    private String scriptType;
    private String taskLabel;
    private String status;
    private String scriptId;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime startTime;
    private LocalDateTime finishTime;
}
