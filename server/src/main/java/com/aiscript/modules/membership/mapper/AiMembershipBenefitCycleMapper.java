package com.aiscript.modules.membership.mapper;

import com.aiscript.modules.membership.entity.AiMembershipBenefitCycle;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;

@Mapper
public interface AiMembershipBenefitCycleMapper extends BaseMapper<AiMembershipBenefitCycle> {
    @Insert("INSERT INTO ai_membership_benefit_cycle "
        + "(tenant_id, subscription_id, user_id, plan_id, cycle_no, cycle_start, cycle_end, status, benefit_snapshot_json) "
        + "VALUES (#{tenantId}, #{subscriptionId}, #{userId}, #{planId}, #{cycleNo}, #{cycleStart}, #{cycleEnd}, "
        + "#{status}, #{benefitSnapshotJson}) "
        + "ON DUPLICATE KEY UPDATE update_time = NOW()")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int upsertCycle(AiMembershipBenefitCycle cycle);
}
