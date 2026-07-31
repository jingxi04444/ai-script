package com.aiscript.modules.payment.controller;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.api.R;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.payment.dto.PaymentOrderDTO;
import com.aiscript.modules.payment.dto.PaymentOrderQueryDTO;
import com.aiscript.modules.payment.service.PaymentService;
import com.aiscript.modules.payment.vo.QuotaVO;
import com.aiscript.modules.payment.vo.PaymentOrderVO;
import com.aiscript.modules.payment.vo.WalletTransactionVO;
import com.aiscript.modules.payment.vo.WalletVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/recharge")
    public R<PaymentOrderVO> recharge(@RequestBody PaymentOrderDTO payload) {
        return R.ok(paymentService.recharge(payload));
    }

    @PostMapping("/recharge-orders")
    public R<PaymentOrderVO> rechargeOrder(@RequestBody PaymentOrderDTO payload) { return R.ok(paymentService.recharge(payload)); }

    @PostMapping("/member-order")
    public R<PaymentOrderVO> memberOrder(@RequestBody PaymentOrderDTO payload) {
        return R.ok(paymentService.memberOrder(payload));
    }

    @PostMapping("/member-orders")
    public R<PaymentOrderVO> memberOrders(@RequestBody PaymentOrderDTO payload) { return R.ok(paymentService.memberOrder(payload)); }

    @PostMapping("/point-orders")
    public R<PaymentOrderVO> pointOrders(@RequestBody PaymentOrderDTO payload) {
        return R.ok(paymentService.pointOrder(payload));
    }
    @GetMapping("/orders")
    public R<PageResult<PaymentOrderVO>> orders(PaymentOrderQueryDTO query) { return R.ok(paymentService.orders(query)); }

    @GetMapping("/orders/{orderNo}")
    public R<PaymentOrderVO> getOrder(@PathVariable String orderNo) { return R.ok(paymentService.getOrder(orderNo)); }

    @PostMapping("/orders/{orderNo}/close")
    public R<PaymentOrderVO> closeOrder(@PathVariable String orderNo) { return R.ok(paymentService.closeOrder(orderNo)); }

    @PostMapping("/orders/{orderNo}/query-provider")
    public R<PaymentOrderVO> queryProviderOrder(@PathVariable String orderNo) { return R.ok(paymentService.queryProviderOrder(orderNo)); }

    @GetMapping("/wallet")
    public R<WalletVO> wallet() {
        return R.ok(paymentService.wallet());
    }

    @GetMapping("/wallet/transactions")
    public R<PageResult<WalletTransactionVO>> walletTransactions(PageQuery query) {
        return R.ok(paymentService.walletTransactions(query));
    }

    @GetMapping("/quotas")
    public R<List<QuotaVO>> quotas() {
        return R.ok(paymentService.quotas());
    }

}
