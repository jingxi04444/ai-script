package com.aiscript.modules.membership.task;

import com.aiscript.modules.membership.service.MembershipService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MembershipSubscriptionLifecycleTask {
    private final MembershipService membershipService;

    public MembershipSubscriptionLifecycleTask(MembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @Scheduled(fixedDelayString = "${aiscript.membership.lifecycle-fixed-delay-ms:300000}")
    public void processDueLifecycle() {
        membershipService.sendExpiryReminders();
        membershipService.processDueSubscriptionLifecycle();
    }
}
