package com.aiscript.modules.payment.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.payment.dto.RefundQueryDTO;
import com.aiscript.modules.payment.dto.RefundReviewDTO;
import com.aiscript.modules.payment.service.PaymentRefundService;
import com.aiscript.modules.payment.vo.RefundOrderVO;
import com.aiscript.security.LoginUser;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/payments/refunds")
public class AdminPaymentRefundController {
    private final PaymentRefundService refundService;

    public AdminPaymentRefundController(PaymentRefundService refundService) {
        this.refundService = refundService;
    }

    @GetMapping
    public R<PageResult<RefundOrderVO>> refunds(@Valid RefundQueryDTO query) {
        return R.ok(refundService.adminRefunds(query));
    }

    @PostMapping("/{refundNo}/review")
    public R<RefundOrderVO> review(
        @PathVariable String refundNo,
        @Valid @RequestBody RefundReviewDTO dto
    ) {
        return R.ok(refundService.review(
            refundNo, dto.getApproved(), dto.getRemark(), currentUser().getUserId()
        ));
    }

    @PostMapping("/{refundNo}/refresh")
    public R<RefundOrderVO> refresh(@PathVariable String refundNo) {
        currentUser();
        return R.ok(refundService.refresh(refundNo));
    }

    private LoginUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser loginUser)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "请先登录");
        }
        return loginUser;
    }
}