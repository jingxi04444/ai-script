package com.aiscript.modules.membership.mapper;

import com.aiscript.modules.membership.entity.AiPointTransaction;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiPointTransactionMapper extends BaseMapper<AiPointTransaction> {
    AiPointTransaction selectByRequestNoForUpdate(@Param("requestNo") String requestNo);
}