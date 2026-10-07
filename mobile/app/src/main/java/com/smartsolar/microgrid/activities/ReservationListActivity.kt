package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ReservationApiClient
import com.smartsolar.microgrid.models.ReservationRecord
import com.smartsolar.microgrid.models.StationRecord
import com.smartsolar.microgrid.models.stationLabel
import com.smartsolar.microgrid.models.utcDate
import com.smartsolar.microgrid.models.utcTime
import com.smartsolar.microgrid.ui.SolarUi
import java.util.concurrent.Executors

class ReservationListActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var list: LinearLayout
    private lateinit var message: TextView
    private lateinit var progress: ProgressBar
    private var rows: List<ReservationRecord> = emptyList()
    private var stations: List<StationRecord> = emptyList()
    private var query = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val mode = intent.getStringExtra(MODE_KEY) ?: MODE_UPCOMING
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 28, 32, 40)
            setBackgroundColor(getColor(R.color.solar_background))
        }
        root.addView(SolarUi.backBar(this))
        root.addView(TextView(this).apply {
            text = titleFor(mode)
            textSize = 26f
            setTextColor(getColor(R.color.solar_heading))
        })
        if (mode != MODE_STAFF) {
            root.addView(Button(this).apply {
                text = getString(R.string.find_book_energy)
                setOnClickListener { startActivity(Intent(this@ReservationListActivity, CreateReservationActivity::class.java)) }
            }, wrap())
        }
        root.addView(EditText(this).apply {
            hint = getString(R.string.search_reservations)
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                    query = s?.toString().orEmpty()
                    render(mode)
                }
                override fun afterTextChanged(s: Editable?) = Unit
            })
        }, wrap())
        message = TextView(this).apply { setTextColor(getColor(R.color.solar_error)) }
        root.addView(message, wrap())
        progress = ProgressBar(this)
        root.addView(progress, wrap())
        list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(list, wrap())
        root.addView(Button(this).apply {
            text = getString(R.string.back_to_dashboard)
            setOnClickListener { finish() }
        }, wrap())
        setContentView(ScrollView(this).apply { addView(root) })
    }

    override fun onStart() {
        super.onStart()
        load(intent.getStringExtra(MODE_KEY) ?: MODE_UPCOMING)
    }

    private fun load(mode: String) {
        val token = token() ?: return
        executor.execute {
            try {
                val api = ReservationApiClient(BuildConfig.API_BASE_URL)
                val loadedStations = api.stations(token)
                val loaded = if (mode == MODE_STAFF) api.allReservations(token) else api.myReservations(token)
                runOnUiThread {
                    stations = loadedStations
                    rows = loaded
                    progress.visibility = View.GONE
                    render(mode)
                }
            } catch (error: Exception) {
                runOnUiThread {
                    progress.visibility = View.GONE
                    message.text = error.message ?: getString(R.string.api_error)
                }
            }
        }
    }

    private fun render(mode: String) {
        list.removeAllViews()
        val allowed = when (mode) {
            MODE_HISTORY -> setOf("Completed", "Cancelled")
            MODE_STAFF -> null
            else -> setOf("Pending", "Approved", "Scheduled")
        }
        val visible = rows.filter { row ->
            (allowed == null || row.status in allowed) &&
                (query.isBlank() || listOf(row.reservationId, row.prosumerId, row.stationId, row.status, utcDate(row.scheduledAtUtc), utcTime(row.scheduledAtUtc))
                    .joinToString(" ")
                    .contains(query, ignoreCase = true))
        }
        if (visible.isEmpty()) {
            list.addView(TextView(this).apply {
                text = getString(R.string.no_reservations)
                setTextColor(getColor(R.color.solar_muted))
            })
            return
        }
        visible.sortedBy { it.scheduledAtUtc }.forEach { row ->
            val detail = buildString {
                append(utcDate(row.scheduledAtUtc))
                append("   ")
                append(utcTime(row.scheduledAtUtc))
                append(" UTC   ·   ")
                append(row.status)
                if (mode == MODE_STAFF) {
                    append("\n")
                    append(row.prosumerId)
                }
            }
            list.addView(SolarUi.choiceCard(this, stationLabel(row.stationId, stations), detail) {
                startActivity(Intent(this, ReservationDetailActivity::class.java)
                    .putExtra(ReservationDetailActivity.ID_KEY, row.reservationId))
            }, wrap())
        }
    }

    private fun titleFor(mode: String) = when (mode) {
        MODE_HISTORY -> getString(R.string.booking_history)
        MODE_STAFF -> getString(R.string.operator_bookings)
        else -> getString(R.string.my_bookings)
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

    companion object {
        const val MODE_KEY = "mode"
        const val MODE_UPCOMING = "upcoming"
        const val MODE_HISTORY = "history"
        const val MODE_STAFF = "staff"
    }
}
