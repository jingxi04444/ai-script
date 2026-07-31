package com.aiscript.modules.payment.mapper;

import com.aiscript.modules.payment.entity.AiRefundOrder;
import com.aiscript.modules.payment.vo.RefundOrderVO;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiRefundOrderMapper extends BaseMapper<AiRefundOrder> {
    IPage<RefundOrderVO> selectRefundPage(
        IPage<?> page,
        @Param("userId") Long userId,
        @Param("status") String status,
        @Param("keyword") String keyword
    );
}