package com.aiscript.modules.membership.controller;

import com.aiscript.common.api.R;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.UserMembershipVO;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/membership")
public class MembershipController {
    private final MembershipService membershipService;

    public MembershipController(MembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @GetMapping("/plans")
    public R<List<MembershipPlanVO>> plans() {
        return R.ok(membershipService.plans());
    }

    @GetMapping("/current")
    public R<UserMembershipVO> current() {
        return R.ok(membershipService.currentMembership());
    }
}
