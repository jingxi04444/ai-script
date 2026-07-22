package com.aiscript.modules.membership.service;

import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.UserMembershipVO;
import java.util.List;

public interface MembershipService {
    List<MembershipPlanVO> plans();

    UserMembershipVO currentMembership();
}
