package com.aiscript.modules.user.convert;

import com.aiscript.modules.auth.entity.SysUser;
import com.aiscript.modules.user.vo.UserVO;

public final class UserConvert {
    private UserConvert() {
    }

    public static UserVO toVO(SysUser user) {
        UserVO vo = new UserVO();
        vo.setId(String.valueOf(user.getId()));
        vo.setUsername(user.getUsername());
        vo.setEmail(user.getEmail());
        vo.setPhone(user.getPhone());
        vo.setMemberLevel(user.getMemberLevel());
        vo.setStatus(user.getStatus() != null && user.getStatus() == 1 ? "active" : "disabled");
        vo.setCreatedAt(user.getCreateTime() == null ? null : user.getCreateTime().toString());
        return vo;
    }
}
