package com.aiscript.modules.membership.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("ai_daily_point_reward")
public class AiDailyPointReward {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tenantId;
    private Long userId;
    private LocalDate rewardDate;
    private Long planId;
    private Long rewardPoints;
    private Long transactionId;
    private LocalDateTime createTime;
}