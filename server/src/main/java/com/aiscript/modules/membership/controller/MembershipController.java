package com.aiscript.modules.membership.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.dto.FreeTrialActivateDTO;
import com.aiscript.modules.payment.service.PaymentService;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.MembershipPurchaseModeVO;
import com.aiscript.modules.membership.vo.PointPackageVO;
import com.aiscript.modules.membership.vo.UserMembershipVO;
import com.aiscript.modules.membership.service.MembershipPurchaseModeService;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/membership")
public class MembershipController {
    private final MembershipService membershipService;
    private final PaymentService paymentService;
    private final MembershipPurchaseModeService purchaseModeService;

    public MembershipController(MembershipService membershipService, PaymentService paymentService, MembershipPurchaseModeService purchaseModeService) {
        this.membershipService = membershipService;
        this.paymentService = paymentService;
        this.purchaseModeService = purchaseModeService;
    }

    @GetMapping("/plans")
    public R<List<MembershipPlanVO>> plans() {
        return R.ok(membershipService.plans());
    }

    @GetMapping("/purchase-modes")
    public R<List<MembershipPurchaseModeVO>> purchaseModes() {
        return R.ok(purchaseModeService.list());
    }

    @GetMapping("/point-packages")
    public R<List<PointPackageVO>> pointPackages() {
        return R.ok(membershipService.pointPackages());
    }

    @GetMapping("/current")
    public R<UserMembershipVO> current() {
        return R.ok(membershipService.currentMembership());
    }

    @PostMapping("/free-trial/activate")
    public R<UserMembershipVO> activateFreeTrial(@Valid @RequestBody FreeTrialActivateDTO dto) {
        try {
            return R.ok(membershipService.activateFreeTrial(Long.valueOf(dto.getSkuId())));
        } catch (NumberFormatException exception) {
            throw new com.aiscript.common.exception.BusinessException("免费套餐订阅方案格式不正确");
        }
    }

    @PostMapping("/auto-renew/cancel")
    public R<Void> cancelAutoRenew() {
        paymentService.cancelWechatAutoRenew();
        return R.ok(null);
    }
}
