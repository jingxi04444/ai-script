package com.aiscript.modules.membership.mapper;

import com.aiscript.modules.membership.entity.AiBenefitUsageTransaction;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiBenefitUsageTransactionMapper extends BaseMapper<AiBenefitUsageTransaction> {
    AiBenefitUsageTransaction selectByRequestNoForUpdate(@Param("requestNo") String requestNo);
}