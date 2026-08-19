package com.aiscript.modules.membership.service.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.dto.AdminPlanBenefitCreateDTO;
import com.aiscript.modules.membership.entity.AiMembershipBenefitDefinition;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.mapper.AiMembershipBenefitDefinitionMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanBenefitMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiPointPackageMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipPointService;
import com.aiscript.modules.membership.service.MembershipService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminMembershipServiceImplTest {
    @Mock private MembershipService membershipService;
    @Mock private MembershipEntitlementService entitlementService;
    @Mock private MembershipPointService pointService;
    @Mock private AiMembershipPlanMapper planMapper;
    @Mock private AiMembershipPlanSkuMapper skuMapper;
    @Mock private AiMembershipBenefitDefinitionMapper benefitDefinitionMapper;
    @Mock private AiMembershipPlanBenefitMapper planBenefitMapper;
    @Mock private AiPointPackageMapper pointPackageMapper;
    @Mock private AiUserSubscriptionMapper subscriptionMapper;
    @InjectMocks private AdminMembershipServiceImpl adminMembershipService;

    @Test
    void pointCostBenefitMustBeANonNegativeInteger() {
        AiMembershipPlan plan = new AiMembershipPlan();
        plan.setId(7);
        AiMembershipBenefitDefinition definition = new AiMembershipBenefitDefinition();
        definition.setId(11L);
        definition.setBenefitCode("SCRIPT_GENERATE_POINT_COST");
        AdminPlanBenefitCreateDTO dto = new AdminPlanBenefitCreateDTO();
        dto.setCode(definition.getBenefitCode());
        dto.setValue("-1");

        when(planMapper.selectById(7)).thenReturn(plan);
        when(benefitDefinitionMapper.selectOne(any())).thenReturn(definition);
        when(planBenefitMapper.selectOne(any())).thenReturn(null);

        assertThatThrownBy(() -> adminMembershipService.createPlanBenefit(7L, dto))
            .isInstanceOf(BusinessException.class)
            .hasMessage("水滴消耗必须是非负整数");
    }

    @Test
    void newUserWelcomePointMustBeANonNegativeInteger() {
        AiMembershipPlan plan = new AiMembershipPlan();
        plan.setId(7);
        AiMembershipBenefitDefinition definition = new AiMembershipBenefitDefinition();
        definition.setId(12L);
        definition.setBenefitCode("NEW_USER_WELCOME_POINT");
        AdminPlanBenefitCreateDTO dto = new AdminPlanBenefitCreateDTO();
        dto.setCode(definition.getBenefitCode());
        dto.setValue("-1");

        when(planMapper.selectById(7)).thenReturn(plan);
        when(benefitDefinitionMapper.selectOne(any())).thenReturn(definition);
        when(planBenefitMapper.selectOne(any())).thenReturn(null);

        assertThatThrownBy(() -> adminMembershipService.createPlanBenefit(7L, dto))
            .isInstanceOf(BusinessException.class)
            .hasMessage("新用户初始水滴必须是非负整数");
    }
}
