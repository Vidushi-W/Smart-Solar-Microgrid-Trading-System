package com.smartsolar.microgrid.reservations

import android.app.Activity
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.models.SlotRecord
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

/**
 * Notices for the reservation screens. The account API is the authority.
 * A slot must be scheduled within the next 7 Colombo days.
 * Update and cancel need at least 12 hours' notice. Create does not.
 */
object BookingRules {
    private val colombo = ZoneOffset.ofHoursMinutes(5, 30)

    fun colomboToday(now: Instant = Instant.now()): LocalDate =
        now.atOffset(colombo).toLocalDate()

    // Start of that date at the fixed +05:30 offset, in epoch millis.
    fun epochMillis(date: LocalDate): Long =
        date.atStartOfDay().toInstant(colombo).toEpochMilli()

    // Builds yyyy-MM-ddTHH:mm:00.000Z from the first 10 date characters and first 5 time characters.
    fun slotInstant(date: String, startTime: String): String =
        "${date.take(10)}T${startTime.take(5)}:00.000Z"

    // False when the time cannot be parsed or the start is earlier than 12 hours from now.
    fun hasTwelveHourNotice(iso: String, now: Instant = Instant.now()): Boolean {
        val start = parseUtc(iso) ?: return false
        return !start.isBefore(now.plus(12, ChronoUnit.HOURS))
    }

    // Started when the slot is not still in the future. Beyond seven days after 23:59:59 on today plus 7 at +05:30.
    fun slotWindow(date: String, startTime: String, now: Instant = Instant.now()): SlotWindow {
        val start = parseUtc(slotInstant(date, startTime)) ?: return SlotWindow.Invalid
        if (!start.isAfter(now)) return SlotWindow.Started
        val latest = colomboToday(now).plusDays(7).atTime(23, 59, 59).toInstant(colombo)
        return if (start.isAfter(latest)) SlotWindow.BeyondSevenDays else SlotWindow.Ok
    }

    // False for Closed, Full, or no remaining capacity, and unless the slot window is Ok.
    fun bookable(slot: SlotRecord, now: Instant = Instant.now()): Boolean {
        if (slot.status == "Closed" || slot.status == "Full" || slot.remainingCapacity <= 0) return false
        return slotWindow(slot.date, slot.startTime, now) == SlotWindow.Ok
    }

    // Returns null when shorter than 16 characters. If there is no Z or plus offset, appends Z.
    private fun parseUtc(iso: String): Instant? {
        val text = iso.trim()
        if (text.length < 16) return null
        val normalized = when {
            text.endsWith("Z") || text.contains('+') -> text
            else -> text.take(19) + "Z"
        }
        return runCatching { Instant.parse(normalized) }.getOrNull()
    }
}

enum class SlotWindow {
    Ok,
    Started,
    BeyondSevenDays,
    Invalid
}

fun Activity.ruleNotice(message: String) {
    com.smartsolar.microgrid.ui.SolarUi.popup(
        activity = this,
        title = getString(R.string.notice_title),
        message = message,
        confirm = getString(R.string.close)
    )
}

// Shows the 12-hour, 7-day, or already-started notice when the API message mentions that rule.
fun Activity.noticeForApi(message: String?): Boolean {
    val text = message.orEmpty()
    val notice = when {
        text.contains("12 hours", ignoreCase = true) -> getString(R.string.twelve_hour_notice)
        text.contains("7 days", ignoreCase = true) -> getString(R.string.seven_day_notice)
        text.contains("already started", ignoreCase = true) -> getString(R.string.slot_already_started)
        else -> return false
    }
    ruleNotice(notice)
    return true
}
