package com.smartsolar.microgrid.activities

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModelProvider
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.journeyapps.barcodescanner.CameraPreview
import com.journeyapps.barcodescanner.DefaultDecoderFactory
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.qr.QrWorkflowModel
import com.smartsolar.microgrid.ui.SolarActivity

class QrScannerActivity : SolarActivity() {
    private lateinit var model: QrWorkflowModel
    private lateinit var camera: DecoratedBarcodeView
    private var reading = false
    private val permission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) scan() else message.text = getString(R.string.camera_denied)
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!setup(getString(R.string.scan_qr), listOf("GridOperator"))) return
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        model = ViewModelProvider(this)[QrWorkflowModel::class.java]
        text(getString(R.string.scanner_hint))
        camera = DecoratedBarcodeView(this).apply {
            barcodeView.decoderFactory = DefaultDecoderFactory(listOf(BarcodeFormat.QR_CODE))
            setStatusText(getString(R.string.scan_qr))
            visibility = View.GONE
            content.addView(this, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(320)))
        }
        camera.barcodeView.addStateListener(object : CameraPreview.StateListener {
            override fun previewSized() = Unit
            override fun previewStarted() = Unit
            override fun previewStopped() = Unit
            override fun cameraClosed() = Unit
            override fun cameraError(error: Exception) {
                reading = false
                camera.pause()
                camera.visibility = View.GONE
                message.text = getString(R.string.camera_unavailable)
            }
        })
        val start = button(getString(R.string.scan_again)) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) scan()
            else permission.launch(Manifest.permission.CAMERA)
        }
        val result = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; content.addView(this) }
        back()
        model.state.observe(this) { state ->
            start.isEnabled = !state.busy && !state.uncertain
            report(state.busy, state.error)
            result.removeAllViews()
            val original = content; content = result
            if (state.uncertain) {
                text(getString(R.string.completion_unknown))
                state.transfer?.let { transfer ->
                    button(getString(R.string.reservation_details)) { open(ReservationDetailActivity::class.java, transfer.reservationId) }
                }
            }
            state.transfer?.let { transfer ->
                heading(getString(if (transfer.reservationStatus == "Completed") R.string.transfer_completed else R.string.verification_result))
                text("${getString(R.string.reservation_id)}: ${transfer.reservationId}")
                text("${getString(R.string.prosumer)}: ${transfer.prosumerId}")
                text("${getString(R.string.station)}: ${transfer.stationId}")
                text("${getString(R.string.slot)}: ${transfer.slotId}")
                text("${transfer.energyKwh} kWh · ${transfer.reservationStatus} · ${transfer.tokenStatus}")
                transfer.completedAtUtc?.let { text("${getString(R.string.completed_at)}: ${date(it)}") }
                transfer.completedBy?.let { text("${getString(R.string.completed_by)}: $it") }
                if (!state.uncertain && state.payload != null && transfer.reservationStatus != "Completed") {
                    button(getString(R.string.confirm_transfer), !state.busy && transfer.reservationStatus == "Scheduled" && transfer.verificationToken != null) {
                        AlertDialog.Builder(this).setTitle(R.string.confirm_transfer)
                            .setMessage("${transfer.reservationId} · ${transfer.energyKwh} kWh")
                            .setPositiveButton(R.string.confirm) { _, _ -> model.complete(api) }
                            .setNegativeButton(R.string.back, null).show()
                    }
                    button(getString(R.string.verify_again), !state.busy) { model.verifyAgain(api) }
                    if (transfer.reservationStatus == "Approved") text(getString(R.string.schedule_before_verify))
                }
                button(getString(R.string.reservation_details), !state.busy) { open(ReservationDetailActivity::class.java, transfer.reservationId) }
            }
            content = original
        }
    }
    private fun scan() {
        if (model.state.value?.busy == true || model.state.value?.uncertain == true) return
        model.reset(); reading = true
        camera.visibility = View.VISIBLE
        camera.resume()
        camera.decodeSingle(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult) {
                if (!reading) return
                reading = false; camera.pause(); camera.visibility = View.GONE
                model.verify(api, result.text)
            }
        })
    }
    override fun onResume() { super.onResume(); if (::camera.isInitialized && reading) camera.resume() }
    override fun onPause() { if (::camera.isInitialized) camera.pause(); super.onPause() }
}
