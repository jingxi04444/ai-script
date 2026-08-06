package com.aiscript.modules.script.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_script_polish_message")
public class AiScriptPolishMessage extends TenantBaseEntity {
    private Integer scriptId;
    private Integer userId;
    private Integer replyToId;
    private String role;
    private String status;
    private String content;
    private String contextSnapshot;
    private String errorMessage;
}
