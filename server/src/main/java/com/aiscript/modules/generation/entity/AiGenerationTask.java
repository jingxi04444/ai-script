package com.aiscript.modules.generation.entity;

import lombok.Data;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.EqualsAndHashCode;

@TableName("ai_generation_task")
@Data
@EqualsAndHashCode(callSuper = true)
public class AiGenerationTask extends TenantBaseEntity {
    private Integer projectId;
    private String taskType;
    private String providerCode;
    private String taskLabel;
    private String status;
    private Integer progress;
    private String inputPayload;
    private String resultPayload;
    private String errorCode;
    private String errorMessage;
    private String idempotencyKey;
    private String quotaRequestNo;
    private LocalDateTime startTime;
    private LocalDateTime finishTime;
}
