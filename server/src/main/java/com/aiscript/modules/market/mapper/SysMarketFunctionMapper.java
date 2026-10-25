package com.aiscript.modules.market.mapper;

import com.aiscript.modules.market.entity.SysMarketFunction;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface SysMarketFunctionMapper extends BaseMapper<SysMarketFunction> {
    @Select("""
        SELECT id
        FROM sys_market_function
        WHERE code = #{code}
        LIMIT 1
        """)
    Long findIdByCodeIncludingDeleted(@Param("code") String code);
}
