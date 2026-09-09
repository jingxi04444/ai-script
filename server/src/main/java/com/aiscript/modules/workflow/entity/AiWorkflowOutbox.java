package com.aiscript.modules.workflow.entity;

import com.aiscript.common.model.LongTenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_workflow_outbox")
public class AiWorkflowOutbox extends LongTenantBaseEntity {
    private String aggregateType;
    private Long aggregateId;
    private String eventType;
    private String payloadJson;
    private String status;
    private Integer attempts;
    private LocalDateTime nextAttemptTime;
    private LocalDateTime sentTime;
    private String errorMessage;
}
