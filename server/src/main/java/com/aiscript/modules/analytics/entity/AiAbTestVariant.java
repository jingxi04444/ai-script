package com.aiscript.modules.analytics.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@TableName("ai_ab_test_variant")
public class AiAbTestVariant {
    @TableId(type = IdType.AUTO)
    public Integer id;
    public Integer abTestId;
    public Integer scriptId;
    public String variantName;
    public Integer monitorLinkId;
    public Long plays;
    public BigDecimal interactionRate;
    public BigDecimal conversionRate;
    public Integer isWinner;
    public LocalDateTime createTime;
}
