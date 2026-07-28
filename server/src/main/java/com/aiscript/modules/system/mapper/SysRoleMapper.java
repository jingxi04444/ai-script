package com.aiscript.modules.system.mapper;

import com.aiscript.modules.system.entity.SysRole;
import com.aiscript.modules.system.vo.RolePageRow;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import org.apache.ibatis.annotations.Param;

public interface SysRoleMapper extends BaseMapper<SysRole> {
    IPage<RolePageRow> selectPageWithPermissions(
        IPage<RolePageRow> page,
        @Param("keyword") String keyword
    );
}
