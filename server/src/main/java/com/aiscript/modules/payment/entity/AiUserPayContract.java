package com.aiscript.modules.payment.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_user_pay_contract")
public class AiUserPayContract {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long userId;
    private Long subscriptionId;
    private String channel;
    private String planId;
    private String contractCode;
    private String contractId;
    private String status;
    private LocalDateTime signedTime;
    private LocalDateTime terminatedTime;
    private String terminateMode;
    private String notifyUrl;
    private String extraJson;
    private Long createBy;
    private LocalDateTime createTime;
    private Long updateBy;
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}
