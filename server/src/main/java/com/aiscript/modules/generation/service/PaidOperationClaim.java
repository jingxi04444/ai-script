package com.aiscript.modules.generation.service;

public record PaidOperationClaim(
    Integer taskId,
    long pointCost,
    PaidOperationStatus status,
    String resultPayload,
    boolean newlyClaimed
) {
    public boolean isSuccess() {
        return PaidOperationStatus.SUCCESS == status;
    }

    public boolean isRunning() {
        return PaidOperationStatus.NEW == status || PaidOperationStatus.RUNNING == status;
    }

    public boolean isFailed() {
        return PaidOperationStatus.FAILED == status;
    }

    /** Only the caller that created the claim may execute the paid work. */
    public boolean shouldExecute() {
        return newlyClaimed && isRunning();
    }
}
