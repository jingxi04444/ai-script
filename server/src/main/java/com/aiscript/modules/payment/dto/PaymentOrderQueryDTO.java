package com.aiscript.modules.payment.dto;

import com.aiscript.common.pagination.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class PaymentOrderQueryDTO extends PageQuery {
    private String status;
    private String payMethod;
    private String orderType;
    private String userId;
}
