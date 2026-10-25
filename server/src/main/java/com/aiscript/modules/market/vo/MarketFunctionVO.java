package com.aiscript.modules.market.vo;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class MarketFunctionVO {
    private String id;
    private String code;
    private String title;
    private String summary;
    private String description;
    private String badge;
    private String icon;
    private String coverUrl;
    private String featureType;
    private String route;
    private String category;
    private List<String> tags;
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime updateTime;
}
