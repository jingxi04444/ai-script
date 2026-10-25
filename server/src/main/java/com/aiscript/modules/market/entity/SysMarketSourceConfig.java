package com.aiscript.modules.market.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("sys_market_source_config")
public class SysMarketSourceConfig {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Integer tenantId;
    private String platform;
    private String cookieEncrypted;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String alertPhoneEncrypted;
    private Integer enabled;
    private Integer alertEnabled;
    private String cookieStatus;
    private String notificationState;
    private Integer consecutiveFailures;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String lastErrorMessage;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDateTime lastCheckedAt;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDateTime lastValidAt;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDateTime lastAlertAt;
    @TableField(fill = FieldFill.INSERT)
    private Integer createBy;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Integer updateBy;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;
    @TableLogic
    private Integer deleted;
}
