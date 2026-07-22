package com.aiscript.modules.brief.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
@TableName("ai_brief_edit_request")
public class AiBriefEditRequest extends TenantBaseEntity {
    private Integer briefId;
    private Integer requesterId;
    private Integer ownerId;
    private String requestMessage;
    private String status;
    private LocalDateTime approveTime;
}
