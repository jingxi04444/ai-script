package com.aiscript.modules.membership.mapper;

import com.aiscript.modules.membership.entity.AiMembershipPlan;
import com.aiscript.modules.membership.vo.MembershipPlanCatalogRow;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiMembershipPlanMapper extends BaseMapper<AiMembershipPlan> {
    List<MembershipPlanCatalogRow> selectPlanCatalog(@Param("includeInactive") boolean includeInactive);
}