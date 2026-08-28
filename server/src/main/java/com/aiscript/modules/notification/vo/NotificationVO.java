package com.aiscript.modules.notification.vo;

import java.time.LocalDateTime;

public class NotificationVO {
    public String id;
    public String userId;
    public String channel;
    public String bizType;
    public String bizId;
    public String targetProjectId;
    public String targetScriptId;
    public String title;
    public String content;
    public Integer status;
    public LocalDateTime readTime;
    public LocalDateTime createTime;
}
