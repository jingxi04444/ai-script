package com.aiscript.integration.sms;

public interface SmsClient {
    void sendVerificationCode(String phone, String code);
}
