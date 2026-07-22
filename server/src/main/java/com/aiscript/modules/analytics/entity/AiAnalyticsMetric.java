package com.aiscript.modules.analytics.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@TableName("ai_analytics_metric")
public class AiAnalyticsMetric {
    @TableId(type = IdType.AUTO)
    public Integer id;
    public Integer tenantId;
    public Integer projectId;
    public Integer scriptId;
    public Integer monitorLinkId;
    public String source;
    public LocalDate metricDate;
    public Long plays;
    public Long likes;
    public Long comments;
    public Long favorites;
    public Long shares;
    public Long orders;
    public BigDecimal revenue;
    public BigDecimal roi;
    public LocalDateTime createTime;
}
