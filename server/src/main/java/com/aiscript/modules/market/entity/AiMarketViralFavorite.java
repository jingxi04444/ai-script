package com.aiscript.modules.market.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_market_viral_favorite")
public class AiMarketViralFavorite {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Integer tenantId;
    private Integer userId;
    private Long videoId;
    private LocalDateTime createTime;
}
