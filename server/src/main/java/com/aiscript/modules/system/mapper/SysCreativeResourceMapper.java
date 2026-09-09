package com.aiscript.modules.system.mapper;

import com.aiscript.modules.system.entity.SysCreativeResource;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface SysCreativeResourceMapper extends BaseMapper<SysCreativeResource> {
    // Codes remain reserved after logical deletion to protect historical references.
    @Select("SELECT id FROM sys_creative_resource WHERE code = #{code} LIMIT 1")
    Long findReservedCode(@Param("code") String code);
}
