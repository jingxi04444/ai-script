package com.aiscript.modules.payment.dto;

import com.aiscript.common.pagination.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class RefundQueryDTO extends PageQuery {
    private String status;
    private String userId;
}