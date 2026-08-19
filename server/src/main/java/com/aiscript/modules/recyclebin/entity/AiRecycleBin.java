package com.aiscript.modules.recyclebin.entity;

import com.aiscript.common.model.TenantBaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ai_recycle_bin")
public class AiRecycleBin extends TenantBaseEntity {
    private String resourceType;
    private Integer resourceId;
    private String resourceName;
    private Integer parentId;
    private String snapshotJson;
    private Integer retentionDays;
    private String recycleStatus;
    private Integer deletedBy;
    private LocalDateTime deletedAt;
    private LocalDateTime expireAt;
    private LocalDateTime restoreTime;
    private LocalDateTime purgeTime;
}
