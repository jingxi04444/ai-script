package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_storage_object")
public class AiStorageObject {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long userId;
    private String objectKey;
    private String requestNo;
    private Long sizeBytes;
    private String bizType;
    private Long bizId;
    private String status;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
