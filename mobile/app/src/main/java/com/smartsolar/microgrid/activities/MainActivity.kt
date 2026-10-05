package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
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
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(48, 72, 48, 48)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        val title = TextView(this).apply {
            text = getString(R.string.app_name)
            textSize = 25f
            setTextColor(Color.rgb(20, 35, 29))
            gravity = Gravity.CENTER
        }
        val subtitle = TextView(this).apply {
            text = getString(R.string.login_subtitle)
            textSize = 16f
            setTextColor(Color.rgb(96, 112, 100))
            setPadding(0, 16, 0, 32)
            gravity = Gravity.CENTER
        }
        identifierInput = EditText(this).apply {
            hint = getString(R.string.username_or_nic)
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_CLASS_TEXT
        }
        passwordInput = EditText(this).apply {
            hint = getString(R.string.password)
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
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
            setOnClickListener { submitLogin() }
        }
        progressBar = ProgressBar(this).apply { visibility = View.GONE }
        messageView = TextView(this).apply {
            setTextColor(Color.rgb(160, 53, 43))
            setPadding(0, 20, 0, 0)
            gravity = Gravity.CENTER
        }
        content.addView(title, matchWidth())
        content.addView(subtitle, matchWidth())
        content.addView(identifierInput, matchWidth())
        content.addView(passwordInput, matchWidth())
        content.addView(passwordToggle, matchWidth())
        content.addView(loginButton, matchWidth())
        signUpLink = TextView(this).apply {
            text = getString(R.string.signup_prompt)
            setTextColor(Color.rgb(160, 62, 44))
            gravity = Gravity.CENTER
            setOnClickListener { startActivity(Intent(this@MainActivity, RegisterProsumerActivity::class.java)) }
        }
        content.addView(signUpLink, matchWidth())
        content.addView(progressBar, matchWidth())
        content.addView(messageView, matchWidth())
        return content
    }

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
