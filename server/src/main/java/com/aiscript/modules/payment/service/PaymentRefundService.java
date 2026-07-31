package com.aiscript.modules.payment.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.modules.payment.dto.RefundQueryDTO;
import com.aiscript.modules.payment.vo.RefundOrderVO;

public interface PaymentRefundService {
    RefundOrderVO requestRefund(Integer tenantId, Integer userId, String orderNo, String reason);

    PageResult<RefundOrderVO> myRefunds(Integer userId, RefundQueryDTO query);

    PageResult<RefundOrderVO> adminRefunds(RefundQueryDTO query);

    RefundOrderVO review(String refundNo, boolean approved, String remark, Integer reviewerId);

    RefundOrderVO refresh(String refundNo);
}