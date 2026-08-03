package com.aiscript.modules.payment.mapper;

import com.aiscript.modules.payment.entity.AiPaymentOrder;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiPaymentOrderMapper extends BaseMapper<AiPaymentOrder> {
    AiPaymentOrder selectByOrderNoForUpdate(@Param("orderNo") String orderNo);
}
