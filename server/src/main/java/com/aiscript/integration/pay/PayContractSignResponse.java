package com.aiscript.integration.pay;

import lombok.Data;

@Data
public class PayContractSignResponse {
    private String provider;
    private String outContractCode;
    private String preEntrustwebId;
    private String redirectUrl;
    private String formHtml;
    private String miniProgramUsername;
    private String rawPayload;
}
