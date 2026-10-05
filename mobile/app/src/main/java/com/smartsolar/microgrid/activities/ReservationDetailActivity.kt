package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ReservationApiClient
import com.smartsolar.microgrid.models.ReservationRecord
import com.smartsolar.microgrid.models.StationRecord
import com.smartsolar.microgrid.models.stationLabel
import com.smartsolar.microgrid.models.utcDate
import com.smartsolar.microgrid.models.utcTime
import java.util.concurrent.Executors

class ReservationDetailActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var body: LinearLayout
    private lateinit var message: TextView
    private lateinit var progress: ProgressBar
    private var stations: List<StationRecord> = emptyList()
    private var reservation: ReservationRecord? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 40)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        root.addView(TextView(this).apply {
            text = getString(R.string.reservation_details)
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
                }
            } catch (error: Exception) {
                showError(error)
            }
        }
    }

    private fun show(row: ReservationRecord) {
        body.removeAllViews()
        val canChange = role() == "Prosumer" || role() == "Backoffice"
        body.addView(note(buildString {
            append(row.reservationId)
            append("\n")
            append(getString(R.string.station_line, stationLabel(row.stationId, stations)))
            append("\n")
            append(getString(R.string.date_line, utcDate(row.scheduledAtUtc)))
            append("\n")
            append(getString(R.string.time_line, "${utcTime(row.scheduledAtUtc)} UTC"))
            append("\n")
            append(getString(R.string.status_line, row.status))
            if (role() != "Prosumer") {
                append("\n")
                append(row.prosumerId)
            }
        }))
        if (canChange) {
            body.addView(Button(this).apply {
                text = getString(R.string.modify_reservation)
                setOnClickListener {
                    startActivity(Intent(this@ReservationDetailActivity, ModifyReservationActivity::class.java)
                        .putExtra(ID_KEY, row.reservationId))
                }
            }, wrap())
            body.addView(Button(this).apply {
                text = getString(R.string.cancel_reservation)
                setOnClickListener { confirmCancel(row) }
            }, wrap())
        }
        body.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { finish() }
        }, wrap())
    }

    private fun confirmCancel(row: ReservationRecord) {
        AlertDialog.Builder(this)
            .setTitle(R.string.cancel_reservation)
            .setMessage(buildString {
                append(getString(R.string.station_line, stationLabel(row.stationId, stations)))
                append("\n")
                append(getString(R.string.date_line, utcDate(row.scheduledAtUtc)))
                append("\n")
                append(getString(R.string.time_line, "${utcTime(row.scheduledAtUtc)} UTC"))
            })
            .setNegativeButton(R.string.keep_reservation, null)
            .setPositiveButton(R.string.cancel_reservation) { _, _ -> cancel(row) }
            .show()
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
            textSize = 20f
            setTextColor(Color.rgb(20, 35, 29))
        })
        body.addView(note(buildString {
            append(getString(R.string.result_line, getString(R.string.result_cancelled)))
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
            text = getString(R.string.view_reservation)
            setOnClickListener { show(row) }
        }, wrap())
        body.addView(Button(this).apply {
            text = getString(R.string.my_bookings)
            setOnClickListener { finish() }
        }, wrap())
    }

    private fun showError(error: Exception) {
        runOnUiThread {
            progress.visibility = View.GONE
            message.text = error.message ?: getString(R.string.api_error)
        }
    }

    private fun note(text: String) = TextView(this).apply {
        this.text = text
        textSize = 16f
        setTextColor(Color.rgb(32, 40, 36))
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
    }
}
