package com.aiscript.modules.membership.mapper;

import com.aiscript.modules.membership.entity.AiUserBenefitUsage;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiUserBenefitUsageMapper extends BaseMapper<AiUserBenefitUsage> {
    int reserveQuota(@Param("usageId") Long usageId, @Param("amount") Long amount);

    int confirmQuota(@Param("usageId") Long usageId, @Param("amount") Long amount);

    int releaseQuota(@Param("usageId") Long usageId, @Param("amount") Long amount);

    int releaseConsumedQuota(@Param("usageId") Long usageId, @Param("amount") Long amount);
}