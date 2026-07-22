package com.aiscript.modules.analytics.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_ab_test")
public class AiAbTest extends TenantBaseEntity {
    public Integer projectId;
    public String testName;
    public String status;
    public LocalDateTime startTime;
    public LocalDateTime endTime;
}
