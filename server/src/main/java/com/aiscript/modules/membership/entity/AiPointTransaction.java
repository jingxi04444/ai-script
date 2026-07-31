package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_point_transaction")
public class AiPointTransaction {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long accountId;
    private Long userId;
    private String transactionType;
    private Long changePoints;
    private Long balanceAfter;
    private String bizType;
    private Long bizId;
    private String requestNo;
    private String sourceOrderNo;
    private String remark;
    private LocalDateTime createTime;
}