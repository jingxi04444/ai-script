package com.aiscript.modules.membership.mapper;

import com.aiscript.modules.membership.entity.AiMembershipPlanBenefit;
import com.aiscript.modules.membership.vo.MembershipEntitlementRow;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiMembershipPlanBenefitMapper extends BaseMapper<AiMembershipPlanBenefit> {
    List<MembershipEntitlementRow> selectActiveEntitlements(@Param("planId") Long planId);
}