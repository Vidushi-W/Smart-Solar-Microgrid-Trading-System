package com.smartsolar.microgrid.activities

import android.content.Intent
import android.os.Bundle
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.ui.SolarActivity
import org.json.JSONObject

class RoleHomeActivity : SolarActivity() {
    private var ready = false
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val savedRole = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE).getString(MainActivity.ROLE_KEY, "")
        val title = getString(when (savedRole) {
            "Prosumer" -> R.string.prosumer_home
            "GridOperator" -> R.string.operator_home
            else -> R.string.backoffice_home
        })
        if (!setup(title)) return
        ready = true
        val summary = text("")
        button(getString(R.string.reservations)) { open(ReservationsActivity::class.java) }
        queue(R.string.requested_reservations, "Requested")
        queue(R.string.approved_reservations, "Approved")
        queue(R.string.scheduled_reservations, "Scheduled")
        button(getString(R.string.booking_history)) { startActivity(Intent(this, ReservationsActivity::class.java).putExtra("history", true).putExtra("status", "Completed")) }
        if (role == "Prosumer" || role == "Backoffice") button(getString(R.string.create_reservation)) { open(ReservationFormActivity::class.java) }
        if (role == "Prosumer") button(getString(R.string.my_profile)) { open(ProsumerProfileActivity::class.java) }
        if (role == "GridOperator") button(getString(R.string.scan_qr)) { open(QrScannerActivity::class.java) }
        button(getString(R.string.retry)) { screen.request { api.dashboard() } }
        button(getString(R.string.logout)) {
            getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE).edit().clear().apply()
            startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        }
        screen.state.observe(this) { state ->
            status(state)
            val counts = state.data as? JSONObject
            summary.text = counts?.let {
                getString(R.string.dashboard_counts, it.getInt("pending"), it.getInt("approvedFuture"), it.getInt("dueSoon"))
            }.orEmpty()
        }
    }
    override fun onResume() { super.onResume(); if (ready) screen.request { api.dashboard() } }
    private fun queue(label: Int, status: String) {
        button(getString(label)) { startActivity(Intent(this, ReservationsActivity::class.java).putExtra("status", status)) }
    }
}
