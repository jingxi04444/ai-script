package com.aiscript.modules.market.dto;

import java.util.List;
import lombok.Data;

@Data
public class MarketFunctionSaveDTO {
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
}
