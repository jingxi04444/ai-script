package com.aiscript.modules.analytics.vo;

import java.math.BigDecimal;

public class AbTestVariantVO {
    public String id;
    public String abTestId;
    public String scriptId;
    public String variantName;
    public String monitorLinkId;
    public Long plays;
    public BigDecimal interactionRate;
    public BigDecimal conversionRate;
    public Integer isWinner;
    public String createdAt;
}
