package com.aiscript.modules.generation.entity;

import com.aiscript.common.model.LongTenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_script_queue_setting")
public class AiScriptQueueSetting extends LongTenantBaseEntity {
    private Integer userId;
    private Integer concurrencyLimit;
}
