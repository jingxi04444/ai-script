package com.aiscript.modules.payment.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.payment.dto.QuotaAdjustDTO;
import com.aiscript.modules.payment.service.PaymentService;
import com.aiscript.modules.payment.vo.QuotaVO;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/quotas")
public class AdminQuotaController {
    private final PaymentService paymentService;

    public AdminQuotaController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/adjust")
    public R<QuotaVO> adjust(@RequestBody QuotaAdjustDTO payload) {
        return R.ok(paymentService.adjustQuota(payload));
    }
}
