package com.aiscript.modules.market.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MarketSourceCredentialVO {
    private String platform;
    private String cookie;
}
