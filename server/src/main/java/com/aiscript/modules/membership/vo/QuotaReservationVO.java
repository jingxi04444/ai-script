package com.aiscript.modules.membership.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class QuotaReservationVO {
    private String requestNo;
    private String benefitCode;
    private Long amount;
    private String status;
}