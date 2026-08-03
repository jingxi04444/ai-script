package com.aiscript.modules.membership.vo;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class PointPackageVO {
    private String id;
    private String code;
    private String name;
    private BigDecimal price;
    private Long points;
    private Long basePoints;
    private Long pointsPer10Yuan;
    private String description;
    private Integer displayOrder;
    private Integer status;
}
