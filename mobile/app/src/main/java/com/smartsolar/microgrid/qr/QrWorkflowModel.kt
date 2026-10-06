package com.smartsolar.microgrid.qr

import android.os.Handler
import android.os.Looper
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.smartsolar.microgrid.api.ApiFailure
import com.smartsolar.microgrid.api.MicrogridApi
import com.smartsolar.microgrid.api.QrPayload
import com.smartsolar.microgrid.api.QrTransfer
import org.json.JSONObject
import java.util.concurrent.Executors

data class QrState(
    val reservation: JSONObject? = null, val payload: QrPayload? = null, val transfer: QrTransfer? = null,
    val busy: Boolean = false, val error: Exception? = null, val uncertain: Boolean = false
)
// Credentials remain in memory across rotation. Never put them in saved bundles,
// preferences, Intent extras, logs, or a local completion record.
class QrWorkflowModel : ViewModel() {
    val state = MutableLiveData(QrState())
    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    fun issue(api: MicrogridApi, id: String) {
        run(false) {
            val detail = api.detail(id)
            QrState(reservation = detail, payload = api.issue(id))
        }
    }
    fun verify(api: MicrogridApi, raw: String) {
        if (state.value?.busy == true) return
        val payload = try { QrPayload.parse(raw) } catch (e: Exception) {
            state.value = QrState(error = IllegalArgumentException("Malformed QR. ${e.message.orEmpty()}")); return
        }
        run(false) { QrState(payload = payload, transfer = api.verify(payload)) }
    }
    fun verifyAgain(api: MicrogridApi) {
        val payload = state.value?.payload ?: return
        verify(api, payload.json().toString())
    }
    fun complete(api: MicrogridApi) {
        val current = state.value ?: return
        val payload = current.payload ?: return
        val transfer = current.transfer ?: return
        val receipt = transfer.verificationToken ?: return
        run(true) { QrState(transfer = api.complete(transfer.transactionId, payload.token, receipt)) }
    }
    fun reset() { if (state.value?.busy != true) state.value = QrState() }
    private fun run(completion: Boolean, work: () -> QrState) {
        val previous = state.value ?: QrState()
        if (previous.busy) return
        // Reissue removes the old display while the outcome is unknown.
        state.value = if (!completion) QrState(busy = true) else previous.copy(busy = true, error = null)
        executor.execute {
            try {
                val result = work()
                main.post { state.value = result }
            } catch (e: Exception) {
                val status = (e as? ApiFailure)?.status
                val uncertain = completion && (status == null || status == 0 || status >= 500 || status in 200..299)
                main.post {
                    state.value = if (completion) previous.copy(payload = null,
                        transfer = previous.transfer?.copy(verificationToken = null), busy = false, error = e, uncertain = uncertain)
                        else QrState(error = e)
                }
            }
        }
    }
    override fun onCleared() { executor.shutdownNow() }
}
