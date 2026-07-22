package com.aiscript.modules.payment.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.modules.payment.dto.PaymentOrderQueryDTO;
import com.aiscript.modules.payment.service.PaymentService;
import com.aiscript.modules.payment.vo.PaymentOrderVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/payments/orders")
public class AdminPaymentOrderController {
    private final PaymentService paymentService;

    public AdminPaymentOrderController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    public R<PageResult<PaymentOrderVO>> orders(PaymentOrderQueryDTO query) {
        return R.ok(paymentService.adminOrders(query));
    }

    @GetMapping("/{orderNo}")
    public R<PaymentOrderVO> detail(@PathVariable String orderNo) {
        return R.ok(paymentService.adminGetOrder(orderNo));
    }

    @PostMapping("/{orderNo}/query-provider")
    public R<PaymentOrderVO> queryProvider(@PathVariable String orderNo) {
        return R.ok(paymentService.adminQueryProviderOrder(orderNo));
    }
}
