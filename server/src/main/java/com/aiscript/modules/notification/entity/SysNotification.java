package com.aiscript.modules.notification.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("sys_notification")
public class SysNotification {
    @TableId(type = IdType.AUTO)
    public Integer id;
    public Integer tenantId;
    public Integer userId;
    public String channel;
    public String title;
    public String content;
    public Integer status;
    public LocalDateTime readTime;
    public LocalDateTime createTime;
}
