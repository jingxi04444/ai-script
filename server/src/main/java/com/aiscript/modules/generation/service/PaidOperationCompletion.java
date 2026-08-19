package com.aiscript.modules.generation.service;

public record PaidOperationCompletion(
    Integer taskId,
    Integer tenantId,
    Integer userId,
    String resultPayload
) {
}
