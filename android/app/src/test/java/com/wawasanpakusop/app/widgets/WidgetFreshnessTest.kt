package com.wawasanpakusop.app.widgets

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.assertEquals
import org.junit.Test

class WidgetFreshnessTest {
    private val now = 1_800_000_000_000L

    @Test fun noSuccessfulFetchIsUnknownNotEmpty() {
        val status = WidgetFreshness.from(0, now)
        assertTrue(status.isStale)
        assertFalse(status.hasSuccessfulSync)
        assertEquals("Belum sync", status.compactLabel)
    }

    @Test fun futureTimestampIsNotTrusted() {
        assertFalse(WidgetFreshness.from(now + 1000, now).hasSuccessfulSync)
    }

    @Test fun recentSuccessfulFetchIsFresh() {
        val status = WidgetFreshness.from(now - 30 * 60_000, now)
        assertFalse(status.isStale)
        assertTrue(status.hasSuccessfulSync)
        assertTrue(status.label.startsWith("Kemas kini "))
    }

    @Test fun twoHoursOldIsStale() {
        val status = WidgetFreshness.from(now - WidgetFreshness.STALE_AFTER_MS, now)
        assertTrue(status.isStale)
        assertEquals("Data lama", status.compactLabel)
    }
}
