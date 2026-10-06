package com.smartsolar.microgrid.activities

import android.app.DatePickerDialog
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ReservationApiClient
import com.smartsolar.microgrid.models.ReservationRecord
import com.smartsolar.microgrid.models.SlotRecord
import com.smartsolar.microgrid.models.StationRecord
import com.smartsolar.microgrid.models.stationLabel
import com.smartsolar.microgrid.models.utcDate
import com.smartsolar.microgrid.models.utcTime
import com.smartsolar.microgrid.reservations.BookingRules
import com.smartsolar.microgrid.reservations.noticeForApi
import com.smartsolar.microgrid.reservations.ruleNotice
import java.time.LocalDate
import java.util.concurrent.Executors

class ModifyReservationActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var body: LinearLayout
    private lateinit var message: TextView
    private lateinit var progress: ProgressBar
    private var stations: List<StationRecord> = emptyList()
    private var reservation: ReservationRecord? = null
    private var slots: List<SlotRecord> = emptyList()
    private var date: String = BookingRules.colomboToday().toString()
    private var slotId = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 40)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        root.addView(TextView(this).apply {
            text = getString(R.string.modify_reservation)
            textSize = 26f
            setTextColor(Color.rgb(20, 35, 29))
        })
        message = TextView(this).apply { setTextColor(Color.rgb(160, 53, 43)) }
        root.addView(message, wrap())
        progress = ProgressBar(this)
        root.addView(progress, wrap())
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(body, wrap())
        setContentView(ScrollView(this).apply { addView(root) })
        load()
    }

    private fun load() {
        val token = token() ?: return
        val id = intent.getStringExtra(ReservationDetailActivity.ID_KEY).orEmpty()
        executor.execute {
            try {
                val api = ReservationApiClient(BuildConfig.API_BASE_URL)
                val loadedStations = api.stations(token)
                val loaded = api.reservation(token, id)
                runOnUiThread {
                    stations = loadedStations
                    reservation = loaded
                    date = utcDate(loaded.scheduledAtUtc).ifBlank { date }
                    progress.visibility = View.GONE
                    showDate()
                    if (!BookingRules.hasTwelveHourNotice(loaded.scheduledAtUtc)) {
                        ruleNotice(getString(R.string.twelve_hour_notice))
                    }
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun showDate() {
        val row = reservation ?: return
        body.removeAllViews()
        body.addView(note(getString(R.string.station_line, stationLabel(row.stationId, stations))))
        body.addView(Button(this).apply {
            text = date
            setOnClickListener {
                val today = BookingRules.colomboToday()
                val parsed = LocalDate.parse(date)
                val current = if (parsed.isBefore(today) || parsed.isAfter(today.plusDays(30))) today else parsed
                val picker = DatePickerDialog(this@ModifyReservationActivity, { _, year, month, day ->
                    val picked = LocalDate.of(year, month + 1, day)
                    slotId = ""
                    if (picked.isAfter(today.plusDays(7))) {
                        date = today.toString()
                        text = date
                        ruleNotice(getString(R.string.seven_day_notice))
                    } else {
                        date = picked.toString()
                        text = date
                    }
                }, current.year, current.monthValue - 1, current.dayOfMonth)
                picker.datePicker.minDate = BookingRules.epochMillis(today)
                picker.datePicker.maxDate = BookingRules.epochMillis(today.plusDays(30))
                picker.show()
            }
        }, wrap())
        body.addView(Button(this).apply {
            text = getString(R.string.load_slots)
            setOnClickListener { loadSlots() }
        }, wrap())
        body.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { finish() }
        }, wrap())
    }

    private fun loadSlots() {
        val token = token() ?: return
        val row = reservation ?: return
        progress.visibility = View.VISIBLE
        message.text = ""
        executor.execute {
            try {
                val loaded = ReservationApiClient(BuildConfig.API_BASE_URL).slots(token, row.stationId, date)
                runOnUiThread {
                    slots = loaded
                    progress.visibility = View.GONE
                    showSlots()
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun showSlots() {
        body.removeAllViews()
        val open = slots.filter { BookingRules.bookable(it) }
        if (open.isEmpty()) body.addView(note(getString(R.string.no_open_slots)))
        open.forEach { slot ->
            body.addView(Button(this).apply {
                text = "${slot.startTime}–${slot.endTime}  ${slot.status}\n${slot.remainingCapacity} remaining"
                isAllCaps = false
                setOnClickListener {
                    if (!canChangeTo(slot)) return@setOnClickListener
                    slotId = slot.slotId
                    showReview(slot)
                }
            }, wrap())
        }
        body.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { showDate() }
        }, wrap())
    }

    private fun showReview(slot: SlotRecord) {
        val row = reservation ?: return
        body.removeAllViews()
        body.addView(note(buildString {
            append(getString(R.string.current_slot, "${utcDate(row.scheduledAtUtc)} ${utcTime(row.scheduledAtUtc)} UTC"))
            append("\n")
            append(getString(R.string.new_slot, "${slot.date} ${slot.startTime}–${slot.endTime} UTC"))
        }))
        body.addView(Button(this).apply {
            text = getString(R.string.update_reservation)
            setOnClickListener {
                if (canChangeTo(slot)) submit(slot)
            }
        }, wrap())
        body.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { showSlots() }
        }, wrap())
    }

    private fun canChangeTo(slot: SlotRecord): Boolean {
        val row = reservation ?: return false
        val currentOk = BookingRules.hasTwelveHourNotice(row.scheduledAtUtc)
        val nextOk = BookingRules.hasTwelveHourNotice(BookingRules.slotInstant(slot.date, slot.startTime))
        if (currentOk && nextOk) return true
        ruleNotice(getString(R.string.twelve_hour_notice))
        return false
    }

    private fun submit(slot: SlotRecord) {
        val token = token() ?: return
        val row = reservation ?: return
        progress.visibility = View.VISIBLE
        message.text = ""
        val whenUtc = "${slot.date.take(10)}T${slot.startTime.take(5)}:00.000Z"
        executor.execute {
            try {
                val api = ReservationApiClient(BuildConfig.API_BASE_URL)
                api.update(token, row.reservationId, row.prosumerId, row.stationId, slot.slotId, whenUtc, row.status)
                val saved = api.reservation(token, row.reservationId)
                runOnUiThread {
                    progress.visibility = View.GONE
                    showSummary(saved)
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun showSummary(row: ReservationRecord) {
        body.removeAllViews()
        body.addView(TextView(this).apply {
            text = getString(R.string.update_summary)
            textSize = 20f
            setTextColor(Color.rgb(20, 35, 29))
        })
        body.addView(note(buildString {
            append(getString(R.string.result_line, getString(R.string.result_updated)))
            append("\n")
            append(row.reservationId)
            append("\n")
            append(stationLabel(row.stationId, stations))
            append("\n")
            append(utcDate(row.scheduledAtUtc))
            append("  ")
            append(utcTime(row.scheduledAtUtc))
            append(" UTC\n")
            append(row.status)
        }))
        body.addView(Button(this).apply {
            text = getString(R.string.back_to_dashboard)
            setOnClickListener { finish() }
        }, wrap())
    }

    private fun showError(error: Exception) {
        runOnUiThread {
            progress.visibility = View.GONE
            if (!noticeForApi(error.message)) message.text = error.message ?: getString(R.string.api_error)
        }
    }

    private fun note(text: String) = TextView(this).apply {
        this.text = text
        textSize = 16f
        setTextColor(Color.rgb(32, 40, 36))
        setPadding(0, 8, 0, 8)
    }

    private fun token(): String? {
        val value = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE).getString(MainActivity.TOKEN_KEY, null)
        if (value.isNullOrBlank()) {
            finish()
            return null
        }
        return value
    }

    private fun wrap() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { topMargin = 12 }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
