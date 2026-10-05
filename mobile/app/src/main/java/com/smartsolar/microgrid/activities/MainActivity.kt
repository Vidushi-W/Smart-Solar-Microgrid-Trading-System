package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
import com.smartsolar.microgrid.authentication.LoginRequest
import com.smartsolar.microgrid.authentication.LoginResponse
import com.smartsolar.microgrid.authentication.LoginRouter
import com.smartsolar.microgrid.authentication.UserRole
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var identifierInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var loginButton: Button
    private lateinit var messageView: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val preferences = getSharedPreferences(SESSION_PREFS, MODE_PRIVATE)
        val savedToken = preferences.getString(TOKEN_KEY, null)
        val savedRole = preferences.getString(ROLE_KEY, null)
        setContentView(createLoginView())
        if (!savedToken.isNullOrBlank() && !savedRole.isNullOrBlank()) {
            loginButton.isEnabled = false
            messageView.text = getString(R.string.signing_in)
            executor.execute {
                try {
                    val identity = com.smartsolar.microgrid.api.MicrogridApi(this).identity()
                    runOnUiThread {
                        if (!isDestroyed) {
                            preferences.edit().putString(ROLE_KEY, identity.getString("role")).apply()
                            openHome(identity.getString("role"))
                        }
                    }
                } catch (error: Exception) {
                    runOnUiThread {
                        if (!isDestroyed) {
                            if ((error as? com.smartsolar.microgrid.api.ApiFailure)?.status == 401) preferences.edit().clear().apply()
                            loginButton.isEnabled = true
                            messageView.text = error.message
                        }
                    }
                }
            }
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
        loginButton = Button(this).apply {
            text = getString(R.string.login)
            setOnClickListener { submitLogin() }
        }
        messageView = TextView(this).apply {
            setTextColor(Color.rgb(160, 53, 43))
            setPadding(0, 20, 0, 0)
            gravity = Gravity.CENTER
        }
        content.addView(title, matchWidth())
        content.addView(subtitle, matchWidth())
        content.addView(identifierInput, matchWidth())
        content.addView(passwordInput, matchWidth())
        content.addView(loginButton, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.register_as_prosumer)
            setOnClickListener { startActivity(Intent(this@MainActivity, RegisterProsumerActivity::class.java)) }
        }, matchWidth())
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

        loginButton.isEnabled = false
        messageView.text = getString(R.string.signing_in)
        executor.execute {
            try {
                val apiClient = AuthenticationApiClient(BuildConfig.API_BASE_URL)
                val response = apiClient.login(LoginRequest(identifier, password))
                val identity = apiClient.getCurrentUser(response.token)
                runOnUiThread { if (!isDestroyed) handleLoginSuccess(response.copy(role = identity.role)) }
            } catch (error: Exception) {
                runOnUiThread {
                    loginButton.isEnabled = true
                    messageView.text = error.message ?: getString(R.string.login_failed)
                }
            }
        }
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
