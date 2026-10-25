package com.aiscript.modules.market.mapper;

import com.aiscript.modules.market.entity.SysMarketSourceConfig;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface SysMarketSourceConfigMapper extends BaseMapper<SysMarketSourceConfig> {
    @Select("""
        SELECT *
        FROM sys_market_source_config
        WHERE tenant_id = #{tenantId}
          AND platform = #{platform}
          AND deleted = 0
        LIMIT 1
        """)
    SysMarketSourceConfig selectByTenantAndPlatform(
        @Param("tenantId") Integer tenantId,
        @Param("platform") String platform
    );
}
