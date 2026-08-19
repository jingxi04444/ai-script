package com.aiscript.modules.generation.entity;

import com.aiscript.common.model.LongTenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_script_generation_queue_item")
public class AiScriptGenerationQueueItem extends LongTenantBaseEntity {
    private Integer projectId;
    private String batchNo;
    private String requestNo;
    private String scriptType;
    private String taskLabel;
    private String status;
    private String requestPayload;
    private Integer scriptId;
    private String errorMessage;
    private LocalDateTime startTime;
    private LocalDateTime finishTime;
}
