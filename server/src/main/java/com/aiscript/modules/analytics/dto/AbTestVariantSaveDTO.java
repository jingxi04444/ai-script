package com.aiscript.modules.analytics.dto;

import java.math.BigDecimal;

public class AbTestVariantSaveDTO {
    public String scriptId;
    public String variantName;
    public String monitorLinkId;
    public Long plays;
    public BigDecimal interactionRate;
    public BigDecimal conversionRate;
    public Integer isWinner;
}
