package com.aiscript.modules.membership.entity;

import lombok.Data;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_user_membership")
@Data
public class AiUserMembership {
    @TableId(type = IdType.AUTO)
    private Integer id;
    private Integer tenantId;
    private Integer userId;
    private Integer planId;
    private String status;
    private String sourceOrderNo;
    private String sourcePayMethod;
    private String planSnapshotJson;
    private LocalDateTime startTime;
    private LocalDateTime expireTime;
    private LocalDateTime createTime;
}
