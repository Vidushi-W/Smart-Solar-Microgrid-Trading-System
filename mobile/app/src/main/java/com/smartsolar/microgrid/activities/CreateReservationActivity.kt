// Prosumer booking flow: active stations, a Colombo date, open slots, then confirm.
// Creates through the reservation API. The date picker spans 30 days, but a day past 7 is rejected.
package com.smartsolar.microgrid.activities

import android.app.DatePickerDialog
import android.content.Intent
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
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
import com.smartsolar.microgrid.models.ReservationRecord
import com.smartsolar.microgrid.models.SlotRecord
import com.smartsolar.microgrid.models.StationRecord
import com.smartsolar.microgrid.models.stationLabel
import com.smartsolar.microgrid.models.utcDate
import com.smartsolar.microgrid.models.utcTime
import com.smartsolar.microgrid.reservations.BookingRules
import com.smartsolar.microgrid.reservations.SlotWindow
import com.smartsolar.microgrid.reservations.noticeForApi
import com.smartsolar.microgrid.reservations.ruleNotice
import com.smartsolar.microgrid.ui.SolarUi
import java.time.LocalDate
import java.util.concurrent.Executors

class CreateReservationActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var body: LinearLayout
    private lateinit var message: TextView
    private lateinit var progress: ProgressBar
    private var stations: List<StationRecord> = emptyList()
    private var slots: List<SlotRecord> = emptyList()
    private var stationId = ""
    private var slotId = ""
    private var date: String = BookingRules.colomboToday().toString()
    private var userId = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 40)
            setBackgroundColor(getColor(R.color.solar_background))
        }
        root.addView(SolarUi.backBar(this))
        root.addView(TextView(this).apply {
            text = getString(R.string.find_book_energy)
            textSize = 26f
            setTextColor(getColor(R.color.solar_heading))
        })
        message = TextView(this).apply { setTextColor(getColor(R.color.solar_error)) }
        root.addView(message, wrap())
        progress = ProgressBar(this).apply { visibility = View.GONE }
        root.addView(progress, wrap())
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(body, wrap())
        setContentView(ScrollView(this).apply { addView(root) })
        loadStations()
    }

    // Loads the signed-in user and keeps stations whose status is Active.
    private fun loadStations() {
        val token = token() ?: return
        progress.visibility = View.VISIBLE
        executor.execute {
            try {
                val user = AuthenticationApiClient(BuildConfig.API_BASE_URL).getCurrentUser(token)
                val loaded = ReservationApiClient(BuildConfig.API_BASE_URL).stations(token)
                    .filter { it.status == "Active" }
                runOnUiThread {
                    userId = user.userId
                    stations = loaded
                    progress.visibility = View.GONE
                    showStations()
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun showStations() {
        body.removeAllViews()
        body.addView(heading(getString(R.string.choose_station)))
        if (stations.isEmpty()) body.addView(note(getString(R.string.no_stations)))
        stations.forEach { station ->
            body.addView(SolarUi.choiceCard(this, stationLabel(station), station.stationId) {
                stationId = station.stationId
                slotId = ""
                date = BookingRules.colomboToday().toString()
                showDate()
            }, wrap())
        }
        body.addView(backHome())
    }

    // Picker range is 30 days, but a day past the next 7 is reset to today and a notice is shown.
    private fun showDate() {
        body.removeAllViews()
        body.addView(heading(stationLabel(stationId, stations)))
        body.addView(Button(this).apply {
            text = date
            setOnClickListener {
                val today = BookingRules.colomboToday()
                val parsed = LocalDate.parse(date)
                val current = if (parsed.isBefore(today) || parsed.isAfter(today.plusDays(30))) today else parsed
                val picker = DatePickerDialog(this@CreateReservationActivity, { _, year, month, day ->
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
        body.addView(SolarUi.primaryButton(this, getString(R.string.load_slots)) { loadSlots() }, wrap())
        body.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { showStations() }
        }, wrap())
    }

    private fun loadSlots() {
        val token = token() ?: return
        progress.visibility = View.VISIBLE
        message.text = ""
        executor.execute {
            try {
                val loaded = ReservationApiClient(BuildConfig.API_BASE_URL).slots(token, stationId, date)
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
        body.addView(heading(stationLabel(stationId, stations)))
        body.addView(note(date))
        val open = slots.filter { BookingRules.bookable(it) }
        if (open.isEmpty()) body.addView(note(getString(R.string.no_open_slots)))
        open.forEach { slot ->
            body.addView(SolarUi.choiceCard(
                this,
                "${slot.startTime}–${slot.endTime}",
                "${slot.status} · ${slot.remainingCapacity} remaining"
            ) {
                slotId = slot.slotId
                showReview()
            }, wrap())
        }
        body.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { showDate() }
        }, wrap())
    }

    private fun showReview() {
        val slot = slots.find { it.slotId == slotId } ?: return
        body.removeAllViews()
        body.addView(heading(getString(R.string.review_reservation)))
        body.addView(SolarUi.facts(this, listOf(
            getString(R.string.station) to stationLabel(stationId, stations),
            "Date" to slot.date,
            "Time" to "${slot.startTime}–${slot.endTime} UTC"
        )), wrap())
        body.addView(SolarUi.primaryButton(this, getString(R.string.confirm_reservation)) { confirm(slot) }, wrap())
        body.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { showSlots() }
        }, wrap())
    }

    // Stops when the slot has started or is outside the 7-day window, then creates the reservation and reloads it.
    private fun confirm(slot: SlotRecord) {
        when (BookingRules.slotWindow(slot.date, slot.startTime)) {
            SlotWindow.Started -> {
                ruleNotice(getString(R.string.slot_already_started))
                return
            }
            SlotWindow.BeyondSevenDays, SlotWindow.Invalid -> {
                ruleNotice(getString(R.string.seven_day_notice))
                return
            }
            SlotWindow.Ok -> Unit
        }
        val token = token() ?: return
        progress.visibility = View.VISIBLE
        message.text = ""
        val whenUtc = "${slot.date.take(10)}T${slot.startTime.take(5)}:00.000Z"
        executor.execute {
            try {
                val api = ReservationApiClient(BuildConfig.API_BASE_URL)
                val created = api.create(token, userId, stationId, slot.slotId, whenUtc)
                val saved = api.reservation(token, created.reservationId)
                runOnUiThread {
                    progress.visibility = View.GONE
                    showSummary(saved)
                    ruleNotice(getString(R.string.reservation_successful))
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun showSummary(reservation: ReservationRecord) {
        body.removeAllViews()
        body.addView(heading(getString(R.string.booking_summary)))
        body.addView(SolarUi.facts(this, summaryFacts(reservation, getString(R.string.result_booked))), wrap())
        body.addView(SolarUi.primaryButton(this, getString(R.string.view_reservation)) {
            startActivity(Intent(this, ReservationDetailActivity::class.java)
                .putExtra(ReservationDetailActivity.ID_KEY, reservation.reservationId))
            finish()
        }, wrap())
        body.addView(backHome())
    }

    // Rule failures use a notice popup. Any other error is written on the screen.
    private fun showError(error: Exception) {
        runOnUiThread {
            progress.visibility = View.GONE
            if (!noticeForApi(error.message)) message.text = error.message ?: getString(R.string.api_error)
        }
    }

    private fun summaryFacts(reservation: ReservationRecord, result: String) = listOf(
        "Result" to result,
        getString(R.string.station) to stationLabel(reservation.stationId, stations),
        "Date" to utcDate(reservation.scheduledAtUtc),
        "Time" to "${utcTime(reservation.scheduledAtUtc)} UTC",
        "Status" to reservation.status,
        getString(R.string.reservation_id) to reservation.reservationId
    )

    private fun heading(text: String) = TextView(this).apply {
        this.text = text
        textSize = 20f
        setTextColor(getColor(R.color.solar_heading))
        setPadding(0, 16, 0, 8)
    }

    private fun note(text: String) = TextView(this).apply {
        this.text = text
        textSize = 15f
        setTextColor(getColor(R.color.solar_muted))
    }

    private fun backHome() = Button(this).apply {
        text = getString(R.string.back_to_dashboard)
        setOnClickListener { finish() }
    }

    // Returns the session JWT, or closes this screen when it is missing.
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
