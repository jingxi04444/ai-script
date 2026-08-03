package com.aiscript.modules.membership.service;

import com.aiscript.modules.membership.dto.AdminMembershipPurchaseModeUpdateDTO;
import com.aiscript.modules.membership.vo.MembershipPurchaseModeVO;
import java.util.List;

public interface MembershipPurchaseModeService {
    List<MembershipPurchaseModeVO> list();

    List<MembershipPurchaseModeVO> save(AdminMembershipPurchaseModeUpdateDTO dto);
}
