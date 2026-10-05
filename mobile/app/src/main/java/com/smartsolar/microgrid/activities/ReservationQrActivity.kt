package com.smartsolar.microgrid.activities

import android.os.Bundle
import android.view.WindowManager
import android.widget.ImageView
import androidx.lifecycle.ViewModelProvider
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeEncoder
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.qr.QrWorkflowModel
import com.smartsolar.microgrid.ui.SolarActivity

class ReservationQrActivity : SolarActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!setup(getString(R.string.transaction_qr), listOf("Prosumer"))) return
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        val id = intent.getStringExtra("reservationId") ?: run { finish(); return }
        val model = ViewModelProvider(this)[QrWorkflowModel::class.java]
        val detail = text("")
        val image = ImageView(this).apply {
            contentDescription = getString(R.string.transaction_qr)
            adjustViewBounds = true
            content.addView(this, params())
        }
        text(getString(R.string.qr_rotation_hint))
        val issue = button(getString(R.string.generate_qr)) { model.issue(api, id) }
        back()
        model.state.observe(this) { state ->
            report(state.busy, state.error)
            issue.isEnabled = !state.busy
            issue.text = getString(if (state.payload == null) R.string.generate_qr else R.string.refresh_qr)
            image.setImageDrawable(null)
            detail.text = state.reservation?.let { r ->
                "${getString(R.string.reservation_id)}: ${r.getString("id")}\n${r.getString("stationName")}\n" +
                "${date(r.getString("start"))} – ${date(r.getString("end"))}\n${r.getDouble("energyKwh")} kWh · ${r.getString("status")}"
            }.orEmpty()
            state.payload?.let { payload ->
                try { image.setImageBitmap(BarcodeEncoder().encodeBitmap(payload.json().toString(), BarcodeFormat.QR_CODE, 768, 768)) }
                catch (_: Exception) { message.text = getString(R.string.qr_render_failed) }
            }
        }
        // A recreated process has lost its in-memory credential: require explicit
        // issuance rather than silently invalidating a QR being scanned elsewhere.
        if (savedInstanceState == null && model.state.value?.payload == null && model.state.value?.busy != true) model.issue(api, id)
    }
}
