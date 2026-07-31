package com.aiscript.modules.membership.mapper;

import com.aiscript.modules.membership.entity.AiUserSubscription;
import com.aiscript.modules.membership.vo.AdminSubscriptionVO;
import java.util.List;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiUserSubscriptionMapper extends BaseMapper<AiUserSubscription> {
    AiUserSubscription selectActiveByUserForUpdate(@Param("userId") Long userId);

    List<AdminSubscriptionVO> selectAdminPage(
        @Param("keyword") String keyword,
        @Param("status") String status,
        @Param("offset") long offset,
        @Param("pageSize") long pageSize
    );

    long countAdminPage(@Param("keyword") String keyword, @Param("status") String status);
}