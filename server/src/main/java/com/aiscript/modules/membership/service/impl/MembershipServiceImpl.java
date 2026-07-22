package com.aiscript.modules.membership.service.impl;

import com.aiscript.common.api.ResultCode;
import com.aiscript.common.exception.BusinessException;
import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.entity.AiUserMembership;
import com.aiscript.modules.membership.mapper.AiMembershipPlanMapper;
import com.aiscript.modules.membership.mapper.AiUserMembershipMapper;
import com.aiscript.modules.membership.service.MembershipService;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.UserMembershipVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import java.time.LocalDateTime;
import java.util.List;
import com.aiscript.security.LoginUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class MembershipServiceImpl implements MembershipService {
    private final AiMembershipPlanMapper planMapper;
    private final AiUserMembershipMapper userMembershipMapper;

    public MembershipServiceImpl(AiMembershipPlanMapper planMapper, AiUserMembershipMapper userMembershipMapper) {
        this.planMapper = planMapper;
        this.userMembershipMapper = userMembershipMapper;
    }

    @Override
    public List<MembershipPlanVO> plans() {
        return planMapper.selectList(new LambdaQueryWrapper<AiMembershipPlan>()
                .eq(AiMembershipPlan::getStatus, 1)
                .orderByAsc(AiMembershipPlan::getPrice))
            .stream()
            .map(this::toVO)
            .toList();
    }

    @Override
    public UserMembershipVO currentMembership() {
        AiUserMembership membership = userMembershipMapper.selectList(new LambdaQueryWrapper<AiUserMembership>()
                .eq(AiUserMembership::getUserId, currentUserId())
                .eq(AiUserMembership::getStatus, "active")
                .gt(AiUserMembership::getExpireTime, LocalDateTime.now())
                .orderByDesc(AiUserMembership::getExpireTime)
                .last("limit 1"))
            .stream()
            .findFirst()
            .orElse(null);
        if (membership == null) {
            return null;
        }
        UserMembershipVO vo = new UserMembershipVO();
        vo.id = String.valueOf(membership.getId());
        vo.userId = String.valueOf(membership.getUserId());
        vo.planId = String.valueOf(membership.getPlanId());
        vo.status = membership.getStatus();
        vo.startTime = membership.getStartTime() == null ? null : membership.getStartTime().toString();
        vo.expireTime = membership.getExpireTime() == null ? null : membership.getExpireTime().toString();
        return vo;
    }

    private MembershipPlanVO toVO(AiMembershipPlan plan) {
        MembershipPlanVO vo = new MembershipPlanVO();
        vo.setId(String.valueOf(plan.getId()));
        vo.setCode(plan.getPlanCode());
        vo.setName(plan.getPlanName());
        vo.setPrice(plan.getPrice());
        vo.setPeriodDays(plan.getPeriodDays());
        return vo;
    }

    private Integer currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof LoginUser loginUser) {
            return loginUser.getUserId();
        }
        throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录");
    }
}
