package com.aiscript.modules.membership.service;

import com.aiscript.common.api.PageResult;
import com.aiscript.common.pagination.PageQuery;
import com.aiscript.modules.membership.dto.AdminMembershipPlanCreateDTO;
import com.aiscript.modules.membership.dto.AdminMembershipPlanUpdateDTO;
import com.aiscript.modules.membership.dto.AdminMembershipSkuCreateDTO;
import com.aiscript.modules.membership.dto.AdminMembershipSkuUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPlanBenefitCreateDTO;
import com.aiscript.modules.membership.dto.AdminPlanBenefitUpdateDTO;
import com.aiscript.modules.membership.dto.AdminPointAdjustDTO;
import com.aiscript.modules.membership.dto.AdminPointPackageCreateDTO;
import com.aiscript.modules.membership.dto.AdminPointPackageUpdateDTO;
import com.aiscript.modules.membership.vo.AdminSubscriptionVO;
import com.aiscript.modules.membership.vo.MembershipPlanVO;
import com.aiscript.modules.membership.vo.PointTransactionVO;
import com.aiscript.modules.membership.vo.PointPackageVO;
import java.util.List;

public interface AdminMembershipService {
    List<MembershipPlanVO> plans();

    MembershipPlanVO createPlan(AdminMembershipPlanCreateDTO dto);

    MembershipPlanVO updatePlan(Long id, AdminMembershipPlanUpdateDTO dto);

    MembershipPlanVO createSku(Long planId, AdminMembershipSkuCreateDTO dto);

    MembershipPlanVO updateSku(Long id, AdminMembershipSkuUpdateDTO dto);

    MembershipPlanVO createPlanBenefit(Long planId, AdminPlanBenefitCreateDTO dto);

    MembershipPlanVO updatePlanBenefit(Long planId, String benefitCode, AdminPlanBenefitUpdateDTO dto);

    PageResult<AdminSubscriptionVO> subscriptions(PageQuery query, String status);

    PointTransactionVO adjustPoints(AdminPointAdjustDTO dto, Integer operatorId);

    List<PointPackageVO> pointPackages();

    PointPackageVO createPointPackage(AdminPointPackageCreateDTO dto);

    PointPackageVO updatePointPackage(Long id, AdminPointPackageUpdateDTO dto);
}
