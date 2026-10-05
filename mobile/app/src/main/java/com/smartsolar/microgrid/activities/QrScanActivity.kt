package com.smartsolar.microgrid.activities

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.QrApiClient
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class QrScanActivity : AppCompatActivity() {
    private val network = Executors.newSingleThreadExecutor()
    private val cameraExecutor = Executors.newSingleThreadExecutor()
    private val scanner = BarcodeScanning.getClient()
    private val handled = AtomicBoolean(false)
    private lateinit var previewView: PreviewView
    private lateinit var message: TextView
    private lateinit var confirm: Button
    private var qrToken = ""
    private var reservationId = ""
    private var verificationToken = ""

    private val permission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) startCamera() else message.text = getString(R.string.camera_required)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 32)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        root.addView(TextView(this).apply {
            text = getString(R.string.scan_transfer)
            textSize = 24f
            setTextColor(Color.rgb(20, 35, 29))
        })
        previewView = PreviewView(this)
        root.addView(previewView, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            720
        ).apply { topMargin = 16 })
        message = TextView(this).apply {
            setPadding(0, 16, 0, 8)
            textSize = 16f
            setTextColor(Color.rgb(32, 40, 36))
            text = getString(R.string.scan_transfer)
        }
        root.addView(message)
        confirm = Button(this).apply {
            text = getString(R.string.confirm_transfer)
            isEnabled = false
            setOnClickListener { complete() }
        }
        root.addView(confirm)
        root.addView(Button(this).apply {
            text = getString(R.string.scan_again)
            setOnClickListener { resetScan() }
        })
        root.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { finish() }
        })
        setContentView(root)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            permission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startCamera() {
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            try {
                val provider = future.get()
                val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                analysis.setAnalyzer(cameraExecutor) { image ->
                    val media = image.image
                    if (media == null || handled.get()) {
                        image.close()
                        return@setAnalyzer
                    }
                    val input = InputImage.fromMediaImage(media, image.imageInfo.rotationDegrees)
                    scanner.process(input)
                        .addOnSuccessListener { codes ->
                            val raw = codes.firstOrNull()?.rawValue
                            if (!raw.isNullOrBlank() && handled.compareAndSet(false, true)) {
                                runOnUiThread { onScanned(raw) }
                            }
                        }
                        .addOnCompleteListener { image.close() }
                }
                provider.unbindAll()
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
            } catch (error: Exception) {
                message.text = error.message ?: getString(R.string.api_error)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun onScanned(raw: String) {
        val payload = runCatching { JSONObject(raw) }.getOrNull()
        reservationId = payload?.optString("reservationId").orEmpty()
        qrToken = payload?.optString("token").orEmpty()
        if (payload == null || payload.optInt("version") != 1 || reservationId.isBlank() || qrToken.isBlank()) {
            message.text = "This code is not a transfer QR."
            handled.set(false)
            return
        }
        val session = token() ?: return
        message.text = "Checking the code..."
        network.execute {
            try {
                val result = QrApiClient(BuildConfig.API_BASE_URL).verify(session, reservationId, qrToken)
                verificationToken = result.verificationToken
                runOnUiThread {
                    message.text = buildString {
                        append("Reservation: ")
                        append(result.reservationId)
                        append("\nStation: ")
                        append(result.stationId)
                        append("\nStatus: ")
                        append(result.reservationStatus)
                        append("\nCode: ")
                        append(result.tokenStatus)
                    }
                    confirm.isEnabled = verificationToken.isNotBlank()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    message.text = error.message ?: getString(R.string.api_error)
                    confirm.isEnabled = false
                    handled.set(false)
                }
            }
        }
    }

    private fun complete() {
        val session = token() ?: return
        confirm.isEnabled = false
        network.execute {
            try {
                val result = QrApiClient(BuildConfig.API_BASE_URL).complete(session, reservationId, qrToken, verificationToken)
                runOnUiThread {
                    message.text = buildString {
                        append("Transfer finished\n")
                        append(result.reservationId)
                        append("\n")
                        append(result.reservationStatus)
                        append(" · ")
                        append(result.tokenStatus)
                    }
                }
            } catch (error: Exception) {
                runOnUiThread {
                    message.text = error.message ?: getString(R.string.api_error)
                    confirm.isEnabled = true
                }
            }
        }
    }

    private fun resetScan() {
        handled.set(false)
        confirm.isEnabled = false
        verificationToken = ""
        message.text = getString(R.string.scan_transfer)
    }

    private fun token(): String? {
        val value = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.TOKEN_KEY, null)
        if (value.isNullOrBlank()) {
            finish()
            return null
        }
        return value
    }

    override fun onDestroy() {
        network.shutdownNow()
        cameraExecutor.shutdown()
        scanner.close()
        super.onDestroy()
    }
}
