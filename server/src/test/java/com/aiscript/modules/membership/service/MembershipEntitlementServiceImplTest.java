package com.aiscript.modules.membership.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.aiscript.modules.membership.entity.AiBenefitUsageTransaction;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiBenefitUsageTransactionMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanBenefitMapper;
import com.aiscript.modules.membership.mapper.AiUserBenefitUsageMapper;
import com.aiscript.modules.membership.service.impl.MembershipEntitlementServiceImpl;
import com.aiscript.modules.membership.vo.MembershipEntitlementRow;
import com.aiscript.modules.membership.vo.QuotaReservationVO;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MembershipEntitlementServiceImplTest {
    @Mock
    private MembershipService membershipService;
    @Mock
    private AiMembershipPlanBenefitMapper planBenefitMapper;
    @Mock
    private AiUserBenefitUsageMapper usageMapper;
    @Mock
    private AiBenefitUsageTransactionMapper usageTransactionMapper;
    @InjectMocks
    private MembershipEntitlementServiceImpl entitlementService;

    private AiUserSubscription subscription;

    @BeforeEach
    void setUp() {
        subscription = new AiUserSubscription();
        subscription.setId(11L);
        subscription.setPlanId(7L);
        subscription.setUserId(2L);
        subscription.setTenantId(1L);
    }

    @Test
    void shouldReadBooleanFeatureFromCurrentPlan() {
        MembershipEntitlementRow row = entitlement("BRIEF_BATCH_IMPORT", "true", "none");
        when(membershipService.ensureActiveSubscription(1, 2)).thenReturn(subscription);
        when(planBenefitMapper.selectActiveEntitlements(7L)).thenReturn(List.of(row));

        assertThat(entitlementService.hasFeature(1, 2, "BRIEF_BATCH_IMPORT")).isTrue();
    }

    @Test
    void shouldSupportUnlimitedNumericQuota() {
        MembershipEntitlementRow row = entitlement("BRIEF_MAX_ACTIVE", "unlimited", "none");
        when(membershipService.ensureActiveSubscription(1, 2)).thenReturn(subscription);
        when(planBenefitMapper.selectActiveEntitlements(7L)).thenReturn(List.of(row));

        assertThat(entitlementService.getLimit(1, 2, "BRIEF_MAX_ACTIVE")).isEqualTo(-1L);
    }

    @Test
    void previewBenefitMustNotBeEnforcedBeforeLaunch() {
        MembershipEntitlementRow row = entitlement("VIDEO_GENERATE_LIMIT", "80", "membership_month");
        row.setPreviewOnly(true);
        when(membershipService.ensureActiveSubscription(1, 2)).thenReturn(subscription);
        when(planBenefitMapper.selectActiveEntitlements(7L)).thenReturn(List.of(row));

        assertThat(entitlementService.getLimit(1, 2, "VIDEO_GENERATE_LIMIT")).isZero();
    }

    @Test
    void repeatedReservationRequestMustReturnOriginalTransaction() {
        AiBenefitUsageTransaction transaction = new AiBenefitUsageTransaction();
        transaction.setUserId(2L);
        transaction.setBenefitCode("SCRIPT_MONTHLY_LIMIT");
        transaction.setRequestNo("request-1");
        transaction.setAmount(1L);
        transaction.setStatus("confirmed");
        when(usageTransactionMapper.selectByRequestNoForUpdate("request-1")).thenReturn(transaction);

        QuotaReservationVO result = entitlementService.reserveQuota(
            1, 2, "SCRIPT_MONTHLY_LIMIT", 1, "request-1", "script_generate", null
        );

        assertThat(result.getStatus()).isEqualTo("confirmed");
        verifyNoInteractions(usageMapper, membershipService, planBenefitMapper);
    }

    private MembershipEntitlementRow entitlement(String code, String value, String resetType) {
        MembershipEntitlementRow row = new MembershipEntitlementRow();
        row.setPlanId(7L);
        row.setBenefitCode(code);
        row.setBenefitValue(value);
        row.setResetType(resetType);
        row.setDefinitionEnabled(true);
        row.setPlanEnabled(true);
        row.setPreviewOnly(false);
        return row;
    }
}
