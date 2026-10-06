package com.smartsolar.microgrid.reservations

import android.app.Activity
import androidx.appcompat.app.AlertDialog
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

    fun epochMillis(date: LocalDate): Long =
        date.atStartOfDay().toInstant(colombo).toEpochMilli()

    fun slotInstant(date: String, startTime: String): String =
        "${date.take(10)}T${startTime.take(5)}:00.000Z"

    fun hasTwelveHourNotice(iso: String, now: Instant = Instant.now()): Boolean {
        val start = parseUtc(iso) ?: return false
        return !start.isBefore(now.plus(12, ChronoUnit.HOURS))
    }

    fun slotWindow(date: String, startTime: String, now: Instant = Instant.now()): SlotWindow {
        val start = parseUtc(slotInstant(date, startTime)) ?: return SlotWindow.Invalid
        if (!start.isAfter(now)) return SlotWindow.Started
        val latest = colomboToday(now).plusDays(7).atTime(23, 59, 59).toInstant(colombo)
        return if (start.isAfter(latest)) SlotWindow.BeyondSevenDays else SlotWindow.Ok
    }

    fun bookable(slot: SlotRecord, now: Instant = Instant.now()): Boolean {
        if (slot.status == "Closed" || slot.status == "Full" || slot.remainingCapacity <= 0) return false
        return slotWindow(slot.date, slot.startTime, now) == SlotWindow.Ok
    }

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
    AlertDialog.Builder(this)
        .setMessage(message)
        .setPositiveButton(R.string.close, null)
        .show()
}

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
