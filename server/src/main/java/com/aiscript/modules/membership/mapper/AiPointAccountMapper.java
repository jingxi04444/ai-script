package com.aiscript.modules.membership.mapper;

import com.aiscript.modules.membership.entity.AiPointAccount;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiPointAccountMapper extends BaseMapper<AiPointAccount> {
    AiPointAccount selectByUserForUpdate(@Param("userId") Long userId);

    int addPoints(@Param("accountId") Long accountId, @Param("points") Long points);

    int consumePoints(@Param("accountId") Long accountId, @Param("points") Long points);
}