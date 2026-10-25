package com.aiscript.modules.market.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_market_viral_video")
public class AiMarketViralVideo {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Integer tenantId;
    private String category;
    private String platform;
    private String externalId;
    private String title;
    private String authorName;
    private String sourceUrl;
    private String coverUrl;
    private String tags;
    private Integer durationSeconds;
    private Long likeCount;
    private Long commentCount;
    private Long collectCount;
    private Long shareCount;
    private LocalDateTime publishedAt;
    private LocalDateTime lastSeenAt;
    private String discoveryQuery;
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
