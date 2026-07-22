package com.aiscript.modules.analytics.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("ai_monitor_link")
public class AiMonitorLink {
    @TableId(type = IdType.AUTO)
    public Integer id;
    public Integer tenantId;
    public Integer projectId;
    public Integer scriptId;
    public String linkType;
    public String variantName;
    public String url;
    public Integer status;
    public LocalDateTime createTime;
}
