package com.smartsolar.microgrid.ui

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.activities.MainActivity
import com.smartsolar.microgrid.api.ApiFailure
import com.smartsolar.microgrid.api.MicrogridApi
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.concurrent.Executors

data class ScreenState(val data: Any? = null, val busy: Boolean = false, val error: Exception? = null)
class ScreenModel : ViewModel() {
    val state = MutableLiveData(ScreenState())
    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())
    fun request(work: () -> Any) {
        if (state.value?.busy == true) return
        state.value = state.value!!.copy(busy = true, error = null)
        executor.execute {
            try {
                val result = work()
                main.post { state.value = ScreenState(result) }
            } catch (e: Exception) { main.post { state.value = state.value!!.copy(busy = false, error = e) } }
        }
    }
    override fun onCleared() { executor.shutdownNow() }
}

abstract class SolarActivity : AppCompatActivity() {
    protected lateinit var content: LinearLayout
    protected lateinit var message: TextView
    protected lateinit var api: MicrogridApi
    protected lateinit var screen: ScreenModel
    private lateinit var signIn: Button
    protected var role = ""
    protected fun setup(title: String, roles: List<String> = listOf("Prosumer", "GridOperator", "Backoffice")): Boolean {
        val prefs = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
        role = prefs.getString(MainActivity.ROLE_KEY, "").orEmpty()
        if (prefs.getString(MainActivity.TOKEN_KEY, null).isNullOrBlank() || role !in roles) {
            startActivity(Intent(this, MainActivity::class.java)); finish(); return false
        }
        api = MicrogridApi(this)
        screen = ViewModelProvider(this)[ScreenModel::class.java]
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(24), dp(24), dp(24))
            setBackgroundColor(getColor(R.color.solar_background))
        }
        setContentView(ScrollView(this).apply { addView(content) })
        content.addView(SolarUi.backBar(this))
        heading(title)
        message = text("").apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        signIn = button(getString(R.string.login)) {
            prefs.edit().clear().apply()
            com.smartsolar.microgrid.authentication.LocalAccountStore(applicationContext).clear()
            startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
        }.apply { visibility = View.GONE }
        return true
    }
    protected fun heading(value: String) = text(value).apply {
        textSize = 26f
        setTypeface(typeface, android.graphics.Typeface.BOLD)
        setTextColor(getColor(R.color.solar_heading))
    }
    protected fun text(value: String): TextView = TextView(this).apply {
        text = value; textSize = 16f; setTextColor(getColor(R.color.solar_muted))
        layoutParams = params(); content.addView(this)
    }
    protected fun button(label: String, enabled: Boolean = true, action: () -> Unit): Button = Button(this).apply {
        text = label
        isEnabled = enabled
        isAllCaps = false
        backgroundTintList = null
        stateListAnimator = null
        setBackgroundResource(R.drawable.solar_button)
        setTextColor(getColor(R.color.solar_accent))
        setTypeface(typeface, android.graphics.Typeface.BOLD)
        minHeight = dp(52)
        layoutParams = params()
        setOnClickListener { action() }
        content.addView(this)
    }
    protected fun input(label: String): EditText = EditText(this).apply {
        hint = label
        setSingleLine(true)
        layoutParams = params()
        SolarUi.field(this)
        content.addView(this)
    }
    protected fun status(state: ScreenState) {
        report(state.busy, state.error)
    }
    protected fun report(busy: Boolean, error: Exception?) {
        signIn.visibility = if ((error as? ApiFailure)?.status == 401) View.VISIBLE else View.GONE
        message.setTextColor(getColor(if (error != null) R.color.solar_error else R.color.solar_muted))
        message.text = when {
            busy -> getString(R.string.loading)
            error != null -> failureText(error)
            else -> ""
        }
    }
    protected fun failureText(error: Exception): String {
        val prefix = when ((error as? ApiFailure)?.status) {
            0 -> getString(R.string.network_error)
            400 -> getString(R.string.validation_error)
            401 -> getString(R.string.sign_in_required)
            403 -> getString(R.string.forbidden)
            404 -> getString(R.string.not_found)
            409 -> getString(R.string.conflict)
            else -> getString(R.string.request_failed)
        }
        return "$prefix\n${error.message.orEmpty()}"
    }
    protected fun params() = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(12) }
    protected fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    protected fun open(type: Class<*>, id: String? = null) {
        startActivity(Intent(this, type).apply { if (id != null) putExtra("reservationId", id) })
    }
    protected fun back() {
        val label = getString(R.string.back)
        val already = content.childCount > 0 && content.getChildAt(0).contentDescription == label
        if (!already) content.addView(SolarUi.backBar(this), 0)
    }
    companion object {
        fun date(value: String): String = try {
            DateTimeFormatter.ofPattern("EEE, d MMM yyyy HH:mm").withZone(ZoneId.of("Asia/Colombo")).format(Instant.parse(value))
        } catch (_: Exception) { value }
    }
}
