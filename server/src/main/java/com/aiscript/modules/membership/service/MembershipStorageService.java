package com.aiscript.modules.membership.service;

public interface MembershipStorageService {
    String reserve(Integer tenantId, Integer userId, String objectKey, long sizeBytes, String bizType, Long bizId);

    void confirm(String requestNo, String actualObjectKey);

    void release(String requestNo);

    void releaseByObjectKey(Integer tenantId, Integer userId, String objectKey);
}
