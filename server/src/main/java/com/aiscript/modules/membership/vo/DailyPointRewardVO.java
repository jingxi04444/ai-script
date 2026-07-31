package com.aiscript.modules.membership.vo;

import lombok.Data;

@Data
public class DailyPointRewardVO {
    private String rewardDate;
    private Long rewardPoints;
    private Long balanceAfter;
    private Boolean alreadyClaimed;
}