package com.aiscript.modules.generation.service;

public record PaidOperationFailure(
    Integer taskId,
    Integer tenantId,
    Integer userId,
    String errorCode,
    String errorMessage
) {
}
