package com.aiscript.framework.audit;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OperationLogVO {
    private String id;
    private String tenantId;
    private String userId;
    private String moduleCode;
    private String actionCode;
    private String targetType;
    private String targetId;
    private String resultStatus;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime createTime;
}
