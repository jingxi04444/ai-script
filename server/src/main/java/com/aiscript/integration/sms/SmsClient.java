package com.aiscript.integration.sms;

public interface SmsClient {
    void sendVerificationCode(String phone, String code);

    void sendMarketCookieExpiryAlert(String phone, String platformName);
}
