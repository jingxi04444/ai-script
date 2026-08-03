package com.aiscript.modules.membership.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_template_custom_request")
public class AiTemplateCustomRequest extends TenantBaseEntity {
    private Integer userId;
    private Long planId;
    private String title;
    private String requirements;
    private String contact;
    private String status;
    private String adminRemark;
    private Integer handledBy;
    private LocalDateTime handledTime;
}
