package com.aiscript.modules.user.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.auth.mapper.SysUserMapper;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiMembershipPlanSku;
import com.aiscript.modules.membership.entity.AiSubscriptionChangeRecord;
import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiMembershipPlanSkuMapper;
import com.aiscript.modules.membership.mapper.AiSubscriptionChangeRecordMapper;
import com.aiscript.modules.membership.mapper.AiUserSubscriptionMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.system.mapper.SysRoleMapper;
import com.aiscript.modules.system.mapper.SysUserRoleMapper;
import com.aiscript.modules.user.dto.UserMembershipAdjustDTO;
import com.aiscript.modules.user.vo.UserVO;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.springframework.security.crypto.password.PasswordEncoder;

class UserAdminServiceImplTest {
    private SysUserMapper userMapper;
    private AiMembershipPlanMapper planMapper;
    private AiMembershipPlanSkuMapper skuMapper;
    private AiUserSubscriptionMapper subscriptionMapper;
    private AiSubscriptionChangeRecordMapper changeMapper;
    private MembershipEntitlementService entitlementService;
    private UserAdminServiceImpl service;

    @BeforeAll
    static void initializeMybatisMetadata() {
        TableInfoHelper.initTableInfo(
            new MapperBuilderAssistant(new MybatisConfiguration(), "user-admin-service-test"),
            AiUserSubscription.class
        );
    }

    @BeforeEach
    void setUp() {
        userMapper = mock(SysUserMapper.class);
        planMapper = mock(AiMembershipPlanMapper.class);
        skuMapper = mock(AiMembershipPlanSkuMapper.class);
        subscriptionMapper = mock(AiUserSubscriptionMapper.class);
        changeMapper = mock(AiSubscriptionChangeRecordMapper.class);
        entitlementService = mock(MembershipEntitlementService.class);
        service = new UserAdminServiceImpl(
            userMapper,
            mock(SysRoleMapper.class),
            mock(SysUserRoleMapper.class),
            planMapper,
            skuMapper,
            subscriptionMapper,
            changeMapper,
            entitlementService,
            mock(PasswordEncoder.class),
            new ObjectMapper()
        );
    }

    @Test
    void adminCanGrantMembershipToAnOrdinaryUserWithoutChangingAccountType() {
        SysUser user = ordinaryUser();
        AiMembershipPlan plan = plan(2, 2, false);
        AiMembershipPlanSku sku = sku(22L, 2L);
        when(userMapper.selectById(42)).thenReturn(user);
        when(planMapper.selectById(2L)).thenReturn(plan);
        when(skuMapper.selectById(22L)).thenReturn(sku);
        when(subscriptionMapper.selectActiveByUserForUpdate(42L)).thenReturn(null);
        when(subscriptionMapper.insert(any(AiUserSubscription.class))).thenAnswer(invocation -> {
            invocation.getArgument(0, AiUserSubscription.class).setId(900L);
            return 1;
        });

        UserVO result = service.adjustMembership(42, adjustment(2L, 22L, 180), 7);

        assertThat(result.getMemberLevel()).isEqualTo(2);
        assertThat(result.getInternalAccount()).isFalse();
        assertThat(user.getInternalAccount()).isZero();
        ArgumentCaptor<AiUserSubscription> subscriptionCaptor = ArgumentCaptor.forClass(AiUserSubscription.class);
        verify(subscriptionMapper).insert(subscriptionCaptor.capture());
        assertThat(subscriptionCaptor.getValue().getProvider()).isEqualTo("admin");
        assertThat(subscriptionCaptor.getValue().getCurrentPeriodEnd()).isAfter(LocalDateTime.now().plusDays(179));
        ArgumentCaptor<AiSubscriptionChangeRecord> changeCaptor = ArgumentCaptor.forClass(AiSubscriptionChangeRecord.class);
        verify(changeMapper).insert(changeCaptor.capture());
        assertThat(changeCaptor.getValue().getChangeType()).isEqualTo("admin_adjust");
        assertThat(changeCaptor.getValue().getAfterPlanId()).isEqualTo(2L);
        verify(entitlementService).clearEntitlementCache(1, 42);
    }

    @Test
    void paidAdjustmentKeepsProviderAndAgreementFieldsOutOfTheUpdate() {
        SysUser user = ordinaryUser();
        AiMembershipPlan plan = plan(3, 3, false);
        AiMembershipPlanSku sku = sku(33L, 3L);
        AiUserSubscription active = new AiUserSubscription();
        active.setId(901L);
        active.setTenantId(1L);
        active.setUserId(42L);
        active.setPlanId(2L);
        active.setSkuId(22L);
        active.setAutoRenew(1);
        active.setProvider("wechat_auto_deduct");
        active.setAgreementNo("agreement-1");
        active.setVersion(4);
        when(userMapper.selectById(42)).thenReturn(user);
        when(planMapper.selectById(3L)).thenReturn(plan);
        when(skuMapper.selectById(33L)).thenReturn(sku);
        when(subscriptionMapper.selectActiveByUserForUpdate(42L)).thenReturn(active);

        service.adjustMembership(42, adjustment(3L, 33L, 365), 7);

        @SuppressWarnings("rawtypes")
        ArgumentCaptor<LambdaUpdateWrapper> wrapperCaptor = ArgumentCaptor.forClass(LambdaUpdateWrapper.class);
        verify(subscriptionMapper).update(isNull(), wrapperCaptor.capture());
        String sqlSet = wrapperCaptor.getValue().getSqlSet();
        assertThat(sqlSet).contains("plan_id", "sku_id", "auto_renew", "next_renew_time");
        assertThat(sqlSet).doesNotContain("provider", "agreement_no", "source_order_no");
        ArgumentCaptor<AiSubscriptionChangeRecord> changeCaptor = ArgumentCaptor.forClass(AiSubscriptionChangeRecord.class);
        verify(changeMapper).insert(changeCaptor.capture());
        assertThat(changeCaptor.getValue().getBeforePlanId()).isEqualTo(2L);
        assertThat(changeCaptor.getValue().getAfterPlanId()).isEqualTo(3L);
    }

    private SysUser ordinaryUser() {
        SysUser user = new SysUser();
        user.setId(42);
        user.setTenantId(1);
        user.setUserType("front");
        user.setUsername("普通用户");
        user.setMemberLevel(1);
        user.setInternalAccount(0);
        user.setStatus(1);
        return user;
    }

    private AiMembershipPlan plan(int id, int level, boolean free) {
        AiMembershipPlan plan = new AiMembershipPlan();
        plan.setId(id);
        plan.setPlanCode("plan-" + id);
        plan.setPlanName("套餐 " + id);
        plan.setPlanLevel(level);
        plan.setIsFree(free ? 1 : 0);
        plan.setStatus(1);
        return plan;
    }

    private AiMembershipPlanSku sku(long id, long planId) {
        AiMembershipPlanSku sku = new AiMembershipPlanSku();
        sku.setId(id);
        sku.setPlanId(planId);
        sku.setSkuCode("sku-" + id);
        sku.setSkuName("SKU " + id);
        sku.setStatus(1);
        return sku;
    }

    private UserMembershipAdjustDTO adjustment(long planId, long skuId, int validDays) {
        UserMembershipAdjustDTO dto = new UserMembershipAdjustDTO();
        dto.setPlanId(planId);
        dto.setSkuId(skuId);
        dto.setValidDays(validDays);
        return dto;
    }
}
