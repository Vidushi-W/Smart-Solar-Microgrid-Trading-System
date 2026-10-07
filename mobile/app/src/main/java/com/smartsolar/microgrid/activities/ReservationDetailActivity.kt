package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ReservationApiClient
import com.smartsolar.microgrid.models.ReservationRecord
import com.smartsolar.microgrid.models.StationRecord
import com.smartsolar.microgrid.models.stationLabel
import com.smartsolar.microgrid.models.utcDate
import com.smartsolar.microgrid.models.utcTime
import com.smartsolar.microgrid.reservations.BookingRules
import com.smartsolar.microgrid.reservations.noticeForApi
import com.smartsolar.microgrid.reservations.ruleNotice
import com.smartsolar.microgrid.ui.SolarUi
import java.util.concurrent.Executors

class ReservationDetailActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var body: LinearLayout
    private lateinit var message: TextView
    private lateinit var progress: ProgressBar
    private var stations: List<StationRecord> = emptyList()
    private var reservation: ReservationRecord? = null
    private var qrText: String? = null
    private var qrFor: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 40)
            setBackgroundColor(getColor(R.color.solar_background))
        }
        root.addView(com.smartsolar.microgrid.ui.SolarUi.backBar(this))
        root.addView(TextView(this).apply {
            text = getString(R.string.reservation_details)
            textSize = 26f
            setTextColor(getColor(R.color.solar_heading))
        })
        message = TextView(this).apply { setTextColor(getColor(R.color.solar_error)) }
        root.addView(message, wrap())
        progress = ProgressBar(this)
        root.addView(progress, wrap())
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(body, wrap())
        setContentView(ScrollView(this).apply { addView(root) })
    }

    override fun onResume() {
        super.onResume()
        load()
    }

    private fun load() {
        val token = token() ?: return
        val id = intent.getStringExtra(ID_KEY).orEmpty()
        executor.execute {
            try {
                val api = ReservationApiClient(BuildConfig.API_BASE_URL)
                val loadedStations = api.stations(token)
                val loaded = api.reservation(token, id)
                runOnUiThread {
                    stations = loadedStations
                    reservation = loaded
                    progress.visibility = View.GONE
                    show(loaded)
                    if (intent.getBooleanExtra(SHOW_QR_KEY, false)
                        && (loaded.status == "Approved" || loaded.status == "Scheduled")) {
                        intent.removeExtra(SHOW_QR_KEY)
                        loadQr(loaded)
                    }
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun show(row: ReservationRecord) {
        body.removeAllViews()
        val canChange = role() == "Prosumer" || role() == "Backoffice"
        body.addView(SolarUi.statusChip(this, row.status), LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = 8; bottomMargin = 12 })
        val facts = mutableListOf(
            getString(R.string.station) to stationLabel(row.stationId, stations),
            "Date" to utcDate(row.scheduledAtUtc),
            "Time" to "${utcTime(row.scheduledAtUtc)} UTC",
            getString(R.string.reservation_id) to row.reservationId
        )
        if (role() != "Prosumer") facts += getString(R.string.prosumer) to row.prosumerId
        body.addView(SolarUi.facts(this, facts), wrap())
        val open = row.status == "Pending" || row.status == "Approved" || row.status == "Scheduled"
        if (row.status == "Approved" || row.status == "Scheduled") {
            body.addView(SolarUi.primaryButton(this, getString(R.string.show_qr)) { loadQr(row) }, wrap())
        }
        if (canChange && open) {
            body.addView(SolarUi.outlineButton(this, getString(R.string.modify_reservation)) {
                if (!hasNotice(row)) return@outlineButton
                startActivity(Intent(this, ModifyReservationActivity::class.java)
                    .putExtra(ID_KEY, row.reservationId))
            }, wrap())
            body.addView(SolarUi.outlineButton(this, getString(R.string.cancel_reservation)) {
                if (hasNotice(row)) confirmCancel(row)
            }, wrap())
        }
        body.addView(SolarUi.outlineButton(this, getString(R.string.back)) { finish() }, wrap())
    }

    private fun hasNotice(row: ReservationRecord): Boolean {
        if (BookingRules.hasTwelveHourNotice(row.scheduledAtUtc)) return true
        ruleNotice(getString(R.string.twelve_hour_notice))
        return false
    }

    private fun loadQr(row: ReservationRecord) {
        qrText?.takeIf { qrFor == row.reservationId }?.let {
            showQr(it)
            return
        }
        val token = token() ?: return
        progress.visibility = View.VISIBLE
        message.text = ""
        executor.execute {
            try {
                val payload = ReservationApiClient(BuildConfig.API_BASE_URL).issueQr(token, row.reservationId)
                qrText = payload
                qrFor = row.reservationId
                val bitmap = BarcodeEncoder().encodeBitmap(payload, BarcodeFormat.QR_CODE, 720, 720)
                runOnUiThread {
                    progress.visibility = View.GONE
                    showQr(payload, bitmap)
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun showQr(payload: String, bitmap: android.graphics.Bitmap? = null) {
        val image = ImageView(this).apply {
            setImageBitmap(bitmap ?: BarcodeEncoder().encodeBitmap(payload, BarcodeFormat.QR_CODE, 720, 720))
            contentDescription = getString(R.string.show_qr)
            setBackgroundColor(Color.WHITE)
            setPadding(24, 8, 24, 8)
            adjustViewBounds = true
        }
        SolarUi.popup(
            activity = this,
            title = getString(R.string.show_qr),
            message = getString(R.string.transaction_qr),
            content = image,
            confirm = getString(R.string.close)
        )
    }

    private fun confirmCancel(row: ReservationRecord) {
        if (!hasNotice(row)) return
        SolarUi.popup(
            activity = this,
            title = getString(R.string.cancel_reservation),
            message = buildString {
                append(getString(R.string.station_line, stationLabel(row.stationId, stations)))
                append("\n")
                append(getString(R.string.date_line, utcDate(row.scheduledAtUtc)))
                append("\n")
                append(getString(R.string.time_line, "${utcTime(row.scheduledAtUtc)} UTC"))
            },
            confirm = getString(R.string.cancel_reservation),
            dismiss = getString(R.string.keep_reservation),
            onConfirm = { if (hasNotice(row)) cancel(row) }
        )
    }

    private fun cancel(row: ReservationRecord) {
        val token = token() ?: return
        progress.visibility = View.VISIBLE
        message.text = ""
        executor.execute {
            try {
                val api = ReservationApiClient(BuildConfig.API_BASE_URL)
                api.cancel(token, row.reservationId)
                val saved = api.reservation(token, row.reservationId)
                runOnUiThread {
                    reservation = saved
                    progress.visibility = View.GONE
                    showSummary(saved)
                    ruleNotice(getString(R.string.reservation_cancelled_notice))
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun showSummary(row: ReservationRecord) {
        body.removeAllViews()
        body.addView(TextView(this).apply {
            text = getString(R.string.cancellation_summary)
            textSize = 22f
            setTextColor(getColor(R.color.solar_heading))
        })
        body.addView(SolarUi.statusChip(this, row.status), LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = 12; bottomMargin = 12 })
        body.addView(SolarUi.facts(this, listOf(
            getString(R.string.result_line, getString(R.string.result_cancelled)).substringBefore(':') to getString(R.string.result_cancelled),
            getString(R.string.station) to stationLabel(row.stationId, stations),
            "Date" to utcDate(row.scheduledAtUtc),
            "Time" to "${utcTime(row.scheduledAtUtc)} UTC",
            getString(R.string.reservation_id) to row.reservationId
        )), wrap())
        body.addView(SolarUi.primaryButton(this, getString(R.string.view_reservation)) { show(row) }, wrap())
        body.addView(SolarUi.outlineButton(this, getString(R.string.my_bookings)) { finish() }, wrap())
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
        setTextColor(getColor(R.color.solar_heading))
        setPadding(0, 12, 0, 8)
    }

    private fun role() = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
        .getString(MainActivity.ROLE_KEY, "")

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

    companion object {
        const val ID_KEY = "reservationId"
        const val SHOW_QR_KEY = "showQr"
    }
}
