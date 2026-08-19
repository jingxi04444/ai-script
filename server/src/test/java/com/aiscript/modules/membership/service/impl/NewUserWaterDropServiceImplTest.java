package com.aiscript.modules.membership.service.impl;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NewUserWaterDropServiceImplTest {
    @Mock
    private MembershipEntitlementService entitlementService;
    @Mock
    private MembershipPointService pointService;

    private NewUserWaterDropServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new NewUserWaterDropServiceImpl(entitlementService, pointService);
    }

    @Test
    void shouldGrantConfiguredWelcomePointsWithStableRequestNumber() {
        when(entitlementService.getLimit(1, 23, "NEW_USER_WELCOME_POINT")).thenReturn(200L);

        service.initialize(1, 23);

        verify(pointService).account(1, 23);
        verify(pointService).grantPoints(
            1,
            23,
            200L,
            "reward",
            "new_user_welcome:23",
            "new_user_welcome",
            23L,
            null,
            "新用户注册赠送铼河水滴"
        );
    }

    @Test
    void zeroConfigurationShouldOnlyInitializeEmptyAccount() {
        when(entitlementService.getLimit(1, 24, "NEW_USER_WELCOME_POINT")).thenReturn(0L);

        service.initialize(1, 24);

        verify(pointService).account(1, 24);
        verify(pointService, never()).grantPoints(
            1, 24, 0L, "reward", "new_user_welcome:24",
            "new_user_welcome", 24L, null, "新用户注册赠送铼河水滴"
        );
    }
}
