package com.aiscript.modules.auditflow.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_audit_task")
@Data
public class AiAuditTask {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer projectId;
    private Integer scriptId;
    private Integer currentVersionId;
    private String status;
    private String stage;
    private Integer assigneeId;
    private Integer submitterId;
    private String riskSummary;
    private LocalDateTime dueTime;
    private LocalDateTime submitTime;
    private LocalDateTime completeTime;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}
