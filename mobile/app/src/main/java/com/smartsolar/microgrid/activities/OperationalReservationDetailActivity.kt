package com.smartsolar.microgrid.activities

import android.os.Bundle
import android.widget.LinearLayout
import androidx.appcompat.app.AlertDialog
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.strings
import com.smartsolar.microgrid.ui.SolarActivity
import org.json.JSONObject

class OperationalReservationDetailActivity : SolarActivity() {
    private lateinit var id: String
    private lateinit var details: LinearLayout
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!setup(getString(R.string.reservation_details))) return
        id = intent.getStringExtra("reservationId") ?: run { finish(); return }
        button(getString(R.string.retry)) { load() }
        details = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; content.addView(this) }
        back()
        screen.state.observe(this) { state ->
            status(state)
            val row = state.data as? JSONObject
            details.removeAllViews()
            if (row != null) {
                val original = content; content = details
                showReservation(row)
                val allowed = row.getJSONArray("allowedActions").strings()
                val blocks = row.getJSONObject("actionBlocks")
                val actions = when (role) {
                    "GridOperator" -> listOf("schedule")
                    "Backoffice" -> listOf("approve", "reject", "modify", "cancel")
                    else -> listOf("modify", "cancel")
                }
                actions.forEach { action ->
                    val label = when (action) {
                        "schedule" -> getString(R.string.schedule)
                        "approve" -> getString(R.string.approve)
                        "reject" -> getString(R.string.reject)
                        "modify" -> getString(R.string.modify_reservation)
                        else -> getString(R.string.cancel_reservation)
                    }
                    button(label, !state.busy && action in allowed) {
                        if (action == "modify") open(ReservationFormActivity::class.java, id)
                        else if (action == "reject") {
                            val reason = android.widget.EditText(this)
                            AlertDialog.Builder(this).setTitle(label).setView(reason)
                                .setPositiveButton(R.string.confirm) { _, _ ->
                                    val body = JSONObject().put("reason", reason.text.toString())
                                    screen.request { api.action(id, action, body) }
                                }.setNegativeButton(R.string.back, null).show()
                        } else AlertDialog.Builder(this).setTitle(label).setMessage(row.getString("code"))
                            .setPositiveButton(R.string.confirm) { _, _ -> screen.request { api.action(id, action) } }
                            .setNegativeButton(R.string.back, null).show()
                    }
                    if (blocks.has(action)) text(blocks.getString(action))
                }
                if (role == "Prosumer" && row.getString("status") in listOf("Approved", "Scheduled")) {
                    button(getString(R.string.view_qr), !state.busy) { open(ReservationQrActivity::class.java, id) }
                }
                heading(getString(R.string.status_history))
                val history = row.getJSONArray("history")
                if (history.length() == 0) text(getString(R.string.no_history))
                for (index in 0 until history.length()) {
                    val item = history.getJSONObject(index)
                    text("${date(item.getString("at"))} · ${item.getString("action")}\n${item.getString("note")}\n${item.getString("actorRole")} · ${item.getString("actorId")}")
                }
                content = original
            }
        }
    }
    override fun onResume() { super.onResume(); if (::id.isInitialized) load() }
    private fun load() = screen.request { api.detail(id) }
    private fun showReservation(row: JSONObject) {
        heading(row.getString("code"))
        text("${getString(R.string.reservation_id)}: ${row.getString("id")}")
        text("${getString(R.string.prosumer)}: ${row.getString("prosumerName")}")
        text("${getString(R.string.station)}: ${row.getString("stationName")}")
        text("${getString(R.string.slot)}: ${row.getString("slotLabel")}")
        text("${date(row.getString("start"))} – ${date(row.getString("end"))}")
        text("${row.getString("serviceType")} · ${row.getDouble("energyKwh")} kWh · ${row.getString("status")}")
    }
}
