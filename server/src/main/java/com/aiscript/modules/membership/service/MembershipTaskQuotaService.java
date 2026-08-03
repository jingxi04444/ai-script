package com.aiscript.modules.membership.service;

public interface MembershipTaskQuotaService {
    String reserve(Integer tenantId, Integer userId, String taskType, String businessKey);
    void release(String requestNo);
}
