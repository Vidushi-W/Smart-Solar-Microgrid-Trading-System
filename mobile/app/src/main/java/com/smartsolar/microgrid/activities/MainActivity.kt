package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import com.smartsolar.microgrid.ui.SolarUi
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
import com.smartsolar.microgrid.authentication.LocalAccountStore
import com.smartsolar.microgrid.authentication.LoginRequest
import com.smartsolar.microgrid.authentication.LoginResponse
import com.smartsolar.microgrid.authentication.LoginRouter
import com.smartsolar.microgrid.authentication.UserRole
import java.io.IOException
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var identifierInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var messageView: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var signUpLink: TextView
    private lateinit var passwordToggle: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val preferences = getSharedPreferences(SESSION_PREFS, MODE_PRIVATE)
        val savedToken = preferences.getString(TOKEN_KEY, null)
        val savedRole = preferences.getString(ROLE_KEY, null)
        setContentView(createLoginView())
        if (!savedToken.isNullOrBlank() && !savedRole.isNullOrBlank()) {
            validateSavedSession(savedToken, savedRole)
        }
    }

    private fun createLoginView(): View {
        val page = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(getColor(R.color.solar_background))
        }
        val hero = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(36), dp(24), dp(28))
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(
                    getColor(R.color.solar_hero_start),
                    getColor(R.color.solar_hero_mid),
                    getColor(R.color.solar_hero_end)
                )
            )
        }
        val wordmark = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        wordmark.addView(TextView(this).apply {
            text = "Solar"
            textSize = 32f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
        })
        wordmark.addView(TextView(this).apply {
            text = "Grid"
            textSize = 32f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(getColor(R.color.solar_gold))
        })
        hero.addView(wordmark)
        hero.addView(TextView(this).apply {
            text = getString(R.string.login_subtitle)
            textSize = 15f
            setTextColor(Color.parseColor("#F8E4DC"))
            setPadding(0, dp(8), 0, 0)
        })
        page.addView(hero)

        val form = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(24), dp(20), dp(32))
        }
        identifierInput = EditText(this).apply {
            hint = getString(R.string.username_or_nic)
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_CLASS_TEXT
            SolarUi.field(this)
        }
        passwordInput = EditText(this).apply {
            hint = getString(R.string.password)
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            SolarUi.field(this)
        }
        passwordToggle = Button(this).apply {
            text = getString(R.string.show_password)
            setOnClickListener {
                passwordVisible = !passwordVisible
                passwordInput.inputType = android.text.InputType.TYPE_CLASS_TEXT or
                    if (passwordVisible) android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                    else android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
                passwordInput.setSelection(passwordInput.text.length)
                text = getString(if (passwordVisible) R.string.hide_password else R.string.show_password)
            }
        }
        loginButton = Button(this).apply {
            text = getString(R.string.login)
            SolarUi.primary(this)
            setOnClickListener { submitLogin() }
        }
        progressBar = ProgressBar(this).apply { visibility = View.GONE }
        messageView = TextView(this).apply {
            setTextColor(getColor(R.color.solar_error))
            setPadding(0, dp(8), 0, 0)
            gravity = Gravity.CENTER
        }
        signUpLink = TextView(this).apply {
            text = getString(R.string.signup_prompt)
            setTextColor(getColor(R.color.solar_accent))
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, dp(8), 0, 0)
            setOnClickListener { startActivity(Intent(this@MainActivity, RegisterProsumerActivity::class.java)) }
        }
        form.addView(identifierInput, matchWidth())
        form.addView(passwordInput, matchWidth())
        form.addView(passwordToggle, matchWidth())
        form.addView(loginButton, matchWidth())
        form.addView(signUpLink, matchWidth())
        form.addView(progressBar, matchWidth())
        form.addView(messageView, matchWidth())
        page.addView(form)
        return ScrollView(this).apply {
            isFillViewport = true
            addView(page)
        }
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun submitLogin() {
        val identifier = identifierInput.text.toString().trim()
        val password = passwordInput.text.toString()
        if (identifier.isBlank() || password.isBlank()) {
            messageView.text = getString(R.string.credentials_required)
            return
        }

        setLoading(true)
        messageView.text = getString(R.string.signing_in)
        executor.execute {
            try {
                val apiClient = AuthenticationApiClient(BuildConfig.API_BASE_URL)
                val response = apiClient.login(LoginRequest(identifier, password))
                if (response.role == UserRole.BACKOFFICE) {
                    throw IOException(getString(R.string.mobile_role_unavailable))
                }
                val identity = apiClient.getCurrentUser(response.token)
                if (identity.role != response.role) {
                    throw IOException(getString(R.string.login_failed))
                }
                LocalAccountStore(applicationContext).save(identity)
                runOnUiThread {
                    setLoading(false)
                    handleLoginSuccess(response)
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setLoading(false)
                    messageView.text = error.message ?: getString(R.string.login_failed)
                }
            }
        }
    }

    private fun validateSavedSession(token: String, savedRole: String) {
        setLoading(true)
        messageView.text = getString(R.string.checking_session)
        executor.execute {
            try {
                val identity = AuthenticationApiClient(BuildConfig.API_BASE_URL).getCurrentUser(token)
                if (identity.role.apiValue != savedRole || identity.role == UserRole.BACKOFFICE) {
                    throw IOException(getString(R.string.login_failed))
                }
                LocalAccountStore(applicationContext).save(identity)
                runOnUiThread {
                    setLoading(false)
                    openHome(identity.role.apiValue)
                }
            } catch (error: Exception) {
                val invalidSession = error.message?.contains("401", ignoreCase = true) == true
                    || error.message?.contains("inactive", ignoreCase = true) == true
                    || error is SecurityException
                if (invalidSession) {
                    getSharedPreferences(SESSION_PREFS, MODE_PRIVATE).edit().clear().apply()
                    LocalAccountStore(applicationContext).clear()
                }
                runOnUiThread {
                    setLoading(false)
                    if (error.message?.contains("inactive", ignoreCase = true) == true) {
                        messageView.text = getString(R.string.account_inactive)
                    } else if (invalidSession
                        || error.message?.contains("expired", ignoreCase = true) == true) {
                        messageView.text = getString(R.string.session_expired)
                    } else {
                        messageView.text = getString(R.string.api_error)
                    }
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        loginButton.isEnabled = !loading
        identifierInput.isEnabled = !loading
        passwordInput.isEnabled = !loading
        passwordToggle.isEnabled = !loading
        signUpLink.isEnabled = !loading
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun handleLoginSuccess(response: LoginResponse) {
        getSharedPreferences(SESSION_PREFS, MODE_PRIVATE).edit()
            .putString(TOKEN_KEY, response.token)
            .putString(ROLE_KEY, response.role.apiValue)
            .apply()
        openHome(response.role.apiValue)
    }

    private fun openHome(roleValue: String) {
        val role = userRoleFromApiValue(roleValue) ?: return
        val destination = LoginRouter().destinationFor(role)
        startActivity(Intent(this, RoleHomeActivity::class.java).putExtra(ROLE_KEY, destination.roleName))
        finish()
    }

    private fun matchWidth() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = 20 }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }

    companion object {
        const val SESSION_PREFS = "authentication_session"
        const val TOKEN_KEY = "token"
        const val ROLE_KEY = "role"
    }

    private var passwordVisible = false
}

private val UserRole.apiValue: String
    get() = when (this) {
        UserRole.PROSUMER -> "Prosumer"
        UserRole.GRID_OPERATOR -> "GridOperator"
        UserRole.BACKOFFICE -> "Backoffice"
    }

private val com.smartsolar.microgrid.authentication.LoginDestination.roleName: String
    get() = when (this) {
        com.smartsolar.microgrid.authentication.LoginDestination.ProsumerHome -> "Prosumer"
        com.smartsolar.microgrid.authentication.LoginDestination.OperatorHome -> "GridOperator"
        com.smartsolar.microgrid.authentication.LoginDestination.BackofficeHome -> "Backoffice"
    }

private fun userRoleFromApiValue(value: String): UserRole? = when (value) {
    "Prosumer" -> UserRole.PROSUMER
    "GridOperator" -> UserRole.GRID_OPERATOR
    "Backoffice" -> UserRole.BACKOFFICE
    else -> null
}
