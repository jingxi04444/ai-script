package com.aiscript.modules.generation.service;

/**
 * A paid operation request. The request hash must cover every input that can
 * affect the business result; reusing a request number with another hash is a
 * conflict rather than a second charge.
 */
public record PaidOperationSpec(
    Integer tenantId,
    Integer userId,
    Integer projectId,
    String operationCode,
    String taskType,
    String taskLabel,
    String requestNo,
    String requestHash,
    long expectedPointCost
) {
}
