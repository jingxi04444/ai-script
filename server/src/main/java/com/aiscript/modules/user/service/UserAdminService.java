package com.aiscript.modules.user.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.modules.user.dto.UserQueryDTO;
import com.aiscript.modules.user.dto.UserMembershipAdjustDTO;
import com.aiscript.modules.user.dto.InternalUserCreateDTO;
import com.aiscript.modules.user.vo.UserVO;

public interface UserAdminService {
    PageResult<UserVO> page(UserQueryDTO query);

    UserVO getById(Integer id);

    UserVO update(Integer id, UserVO payload);

    UserVO createInternalAccount(InternalUserCreateDTO dto, Integer operatorId, Integer tenantId);

    UserVO adjustMembership(Integer id, UserMembershipAdjustDTO dto, Integer operatorId);

    void enable(Integer id);

    void disable(Integer id);
}
