package com.aiscript.modules.auditflow.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_audit_record")
@Data
public class AiAuditRecord {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer auditTaskId;
    private Integer auditorId;
    private String actionCode;
    private String commentText;
    private String fromStatus;
    private String toStatus;
    private LocalDateTime createTime;
}
