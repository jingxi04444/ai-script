package com.aiscript.modules.market.dto;

import lombok.Data;

@Data
public class MarketViralQueryDTO {
    private Long page = 1L;
    private Long pageSize = 20L;
    private String category;
    private String platform;
    private String keyword;
    private Boolean favoriteOnly;
}
