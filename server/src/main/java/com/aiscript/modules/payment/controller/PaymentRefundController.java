package com.aiscript.modules.payment.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.payment.dto.RefundQueryDTO;
import com.aiscript.modules.payment.dto.RefundRequestDTO;
import com.aiscript.modules.payment.service.PaymentRefundService;
import com.aiscript.modules.payment.vo.RefundOrderVO;
import com.aiscript.security.LoginUser;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/refunds")
public class PaymentRefundController {
    private final PaymentRefundService refundService;

    public PaymentRefundController(PaymentRefundService refundService) {
        this.refundService = refundService;
    }

    @PostMapping
    public R<RefundOrderVO> requestRefund(@Valid @RequestBody RefundRequestDTO dto) {
        LoginUser user = currentUser();
        return R.ok(refundService.requestRefund(
            user.getTenantId(), user.getUserId(), dto.getOrderNo(), dto.getReason()
        ));
    }

    @GetMapping
    public R<PageResult<RefundOrderVO>> myRefunds(@Valid RefundQueryDTO query) {
        return R.ok(refundService.myRefunds(currentUser().getUserId(), query));
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }
}