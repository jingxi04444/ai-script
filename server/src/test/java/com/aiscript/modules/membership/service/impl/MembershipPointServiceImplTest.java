package com.aiscript.modules.membership.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.entity.AiPointAccount;
import com.aiscript.modules.membership.mapper.AiDailyPointRewardMapper;
import com.aiscript.modules.membership.mapper.AiPointAccountMapper;
import com.aiscript.modules.membership.mapper.AiPointTransactionMapper;
import com.aiscript.modules.membership.service.MembershipEntitlementService;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.PointOperationCostsVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MembershipPointServiceImplTest {
    @Mock
    private AiPointAccountMapper accountMapper;
    @Mock
    private AiPointTransactionMapper transactionMapper;
    @Mock
    private AiDailyPointRewardMapper dailyRewardMapper;
    @Mock
    private MembershipEntitlementService entitlementService;
    @Mock
    private MembershipService membershipService;
    @InjectMocks
    private MembershipPointServiceImpl pointService;

    @Test
    void shouldReturnCurrentMembershipOperationCosts() {
        when(entitlementService.getPointCost(1, 2, "brief_detect")).thenReturn(30L);
        when(entitlementService.getPointCost(1, 2, "viral_simple")).thenReturn(30L);
        when(entitlementService.getPointCost(1, 2, "viral_deep")).thenReturn(60L);
        when(entitlementService.getPointCost(1, 2, "script_generate")).thenReturn(25L);
        when(entitlementService.getPointCost(1, 2, "script_polish")).thenReturn(12L);

        PointOperationCostsVO costs = pointService.operationCosts(1, 2);

        assertThat(costs.getBriefDetect()).isEqualTo(30L);
        assertThat(costs.getViralSimple()).isEqualTo(30L);
        assertThat(costs.getViralDeep()).isEqualTo(60L);
        assertThat(costs.getScriptGenerate()).isEqualTo(25L);
        assertThat(costs.getScriptPolish()).isEqualTo(12L);
    }

    @Test
    void insufficientBalanceShouldUseWaterDropBrandMessage() {
        AiPointAccount account = new AiPointAccount();
        account.setId(9L);
        account.setUserId(2L);
        account.setAvailablePoints(3L);
        when(accountMapper.selectOne(any())).thenReturn(account);
        when(accountMapper.selectByUserForUpdate(2L)).thenReturn(account);
        when(transactionMapper.selectByRequestNoForUpdate("request-1")).thenReturn(null);
        when(accountMapper.consumePoints(9L, 10L)).thenReturn(0);

        assertThatThrownBy(() -> pointService.consumePoints(
            1, 2, 10L, "request-1", "script_generate", null, "生成脚本消耗💧"
        ))
            .isInstanceOf(BusinessException.class)
            .hasMessage("💧余额不足")
            .extracting(error -> ((BusinessException) error).getResultCode())
            .isEqualTo(ResultCode.CONFLICT);
    }
}
