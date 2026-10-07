package com.smartsolar.microgrid.activities

import android.content.Intent
import android.os.Bundle
import android.widget.*
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.objects
import com.smartsolar.microgrid.ui.SolarActivity
import org.json.JSONArray

class ReservationsActivity : SolarActivity() {
    private lateinit var rows: LinearLayout
    private lateinit var filter: Spinner
    private lateinit var search: EditText
    private lateinit var day: EditText
    private lateinit var station: EditText
    private val statuses = listOf("", "Requested", "Approved", "Scheduled", "Completed", "Cancelled", "Rejected")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!setup(getString(R.string.reservations))) return
        filter = Spinner(this).apply {
            id = R.id.reservation_status
            adapter = ArrayAdapter(this@ReservationsActivity, android.R.layout.simple_spinner_dropdown_item,
                listOf(getString(R.string.all_reservations)) + statuses.drop(1))
            content.addView(this, params())
            setSelection(statuses.indexOf(intent.getStringExtra("status").orEmpty()).coerceAtLeast(0))
        }
        search = input(getString(R.string.search_reservations)).apply { id = R.id.reservation_search }
        day = input(getString(R.string.date_filter)).apply { id = R.id.reservation_date }
        station = input(getString(R.string.station_filter)).apply { id = R.id.reservation_station }
        val loadButton = button(getString(R.string.search)) { load() }
        if (role == "Prosumer" || role == "Backoffice") button(getString(R.string.create_reservation)) { open(ReservationFormActivity::class.java) }
        if (intent.getBooleanExtra("history", false)) text(getString(R.string.history_hint))
        rows = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; content.addView(this) }
        back()
        screen.state.observe(this) { state ->
            status(state); loadButton.isEnabled = !state.busy
            rows.removeAllViews()
            val list = state.data as? JSONArray
            if (!state.busy && list != null) {
                if (list.length() == 0) rows.addView(TextView(this).apply { text = getString(R.string.no_reservations) })
                list.objects().forEach { row ->
                    rows.addView(com.smartsolar.microgrid.ui.SolarUi.choiceCard(
                        this,
                        "${row.getString("code")} · ${row.getString("status")}",
                        "${row.getString("stationName")}\n${date(row.getString("start"))} · ${row.getDouble("energyKwh")} kWh"
                    ) {
                        startActivity(Intent(this, OperationalReservationDetailActivity::class.java)
                            .putExtra("reservationId", row.getString("id")))
                    }, LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { bottomMargin = dp(10) })
                }
            }
        }
    }
    override fun onResume() { super.onResume(); if (::rows.isInitialized) load() }
    private fun load() {
        val selected = statuses[filter.selectedItemPosition]
        val query = search.text.toString(); val date = day.text.toString(); val stationId = station.text.toString()
        screen.request { api.reservations(selected, query, date, stationId) }
    }
}
