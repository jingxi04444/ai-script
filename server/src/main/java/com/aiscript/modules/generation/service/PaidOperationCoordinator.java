package com.aiscript.modules.generation.service;

public interface PaidOperationCoordinator {
    /**
     * Claims the idempotency task and charges the current membership price in
     * one short, independent transaction.
     */
    PaidOperationClaim claim(PaidOperationSpec spec);

    /**
     * Completes the task in the caller's current transaction. This lets the
     * result and its domain writes commit or roll back together.
     */
    PaidOperationClaim complete(PaidOperationCompletion completion);

    /**
     * Marks an unfinished task failed and refunds it exactly once in an
     * independent transaction.
     */
    PaidOperationClaim failAndRefund(PaidOperationFailure failure);
}
