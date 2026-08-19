package com.aiscript.modules.membership.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.vo.DailyPointRewardVO;
import com.aiscript.modules.membership.vo.PointAccountVO;
import com.aiscript.modules.membership.vo.PointOperationCostsVO;
import com.aiscript.modules.membership.vo.PointTransactionVO;

public interface MembershipPointService {
    PointAccountVO account(Integer tenantId, Integer userId);

    PointOperationCostsVO operationCosts(Integer tenantId, Integer userId);

    PageResult<PointTransactionVO> transactions(Integer userId, PageQuery query);

    PointTransactionVO grantPoints(
        Integer tenantId,
        Integer userId,
        long points,
        String transactionType,
        String requestNo,
        String bizType,
        Long bizId,
        String sourceOrderNo,
        String remark
    );

    PointTransactionVO consumePoints(
        Integer tenantId,
        Integer userId,
        long points,
        String requestNo,
        String bizType,
        Long bizId,
        String remark
    );

    DailyPointRewardVO claimDailyReward(Integer tenantId, Integer userId);
}
