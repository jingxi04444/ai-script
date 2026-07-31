package com.aiscript.modules.membership.vo;

import lombok.Data;

@Data
public class PointTransactionVO {
    private String id;
    private String transactionType;
    private Long changePoints;
    private Long balanceAfter;
    private String bizType;
    private String bizId;
    private String requestNo;
    private String sourceOrderNo;
    private String remark;
    private String createdAt;
}