package com.aiscript.modules.membership.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class MembershipServiceImplTest {
    @Test
    void benefitCycleKeepsOriginalAnchorAcrossShortMonths() {
        LocalDateTime anchor = LocalDateTime.of(2026, 1, 31, 10, 0);

        MembershipServiceImpl.BenefitCycleBounds bounds = MembershipServiceImpl.benefitCycleBounds(
            anchor, LocalDateTime.of(2026, 3, 29, 8, 0)
        );

        assertEquals(1L, bounds.monthOffset());
        assertEquals(LocalDateTime.of(2026, 2, 28, 10, 0), bounds.start());
        assertEquals(LocalDateTime.of(2026, 3, 31, 10, 0), bounds.end());
    }

    @Test
    void benefitCycleStartsNextCycleAtBoundary() {
        LocalDateTime anchor = LocalDateTime.of(2026, 1, 31, 10, 0);

        MembershipServiceImpl.BenefitCycleBounds bounds = MembershipServiceImpl.benefitCycleBounds(
            anchor, LocalDateTime.of(2026, 3, 31, 10, 0)
        );

        assertEquals(2L, bounds.monthOffset());
        assertEquals(LocalDateTime.of(2026, 3, 31, 10, 0), bounds.start());
        assertEquals(LocalDateTime.of(2026, 4, 30, 10, 0), bounds.end());
    }

    @Test
    void benefitCycleUsesFreeSubscriptionStartAsFirstCycleStartWithSecondPrecision() {
        LocalDateTime anchor = LocalDateTime.of(2026, 8, 3, 12, 53, 41);

        MembershipServiceImpl.BenefitCycleBounds bounds = MembershipServiceImpl.benefitCycleBounds(
            anchor, LocalDateTime.of(2026, 8, 3, 12, 53, 42)
        );

        assertEquals(0L, bounds.monthOffset());
        assertEquals(anchor, bounds.start());
        assertEquals(LocalDateTime.of(2026, 9, 3, 12, 53, 41), bounds.end());
    }

    @Test
    void databaseTimeDropsNanosecondsBeforeCycleLookup() {
        LocalDateTime value = LocalDateTime.of(2026, 8, 3, 12, 53, 42, 987_654_321);

        assertEquals(
            LocalDateTime.of(2026, 8, 3, 12, 53, 42),
            MembershipServiceImpl.normalizeDatabaseTime(value)
        );
    }

    @Test
    void pointPackageUsesMembershipPurchaseRatio() {
        assertEquals(2500L, MembershipServiceImpl.calculatePackagePoints(2500L, 500L));
        assertEquals(2750L, MembershipServiceImpl.calculatePackagePoints(2500L, 550L));
        assertEquals(3000L, MembershipServiceImpl.calculatePackagePoints(2500L, 600L));
        assertEquals(0L, MembershipServiceImpl.calculatePackagePoints(2500L, 0L));
    }
}
