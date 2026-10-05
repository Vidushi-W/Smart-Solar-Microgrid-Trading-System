package com.smartsolar.microgrid.activities

import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
import com.smartsolar.microgrid.authentication.MobileAccountProfile
import com.smartsolar.microgrid.authentication.UserRole
import java.util.concurrent.Executors

class StaffProfileActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var avatarView: TextView
    private lateinit var nameInput: EditText
    private lateinit var usernameView: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var roleView: EditText
    private lateinit var statusView: TextView
    private lateinit var createdView: TextView
    private lateinit var passwordInput: EditText
    private lateinit var confirmPasswordInput: EditText
    private lateinit var passwordToggle: Button
    private lateinit var saveButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var messageView: TextView
    private var token: String? = null
    private var role = UserRole.GRID_OPERATOR
    private var passwordVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        token = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.TOKEN_KEY, null)
        role = when (getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.ROLE_KEY, null)) {
            "Backoffice" -> UserRole.BACKOFFICE
            "GridOperator" -> UserRole.GRID_OPERATOR
            else -> {
                finish()
                return
            }
        }
        if (token.isNullOrBlank()) {
            returnToLogin()
            return
        }
        setContentView(createView())
        loadProfile()
    }

    private fun createView(): View {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 40, 48, 48)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        content.addView(Button(this).apply {
            text = getString(R.string.back)
            setOnClickListener { finish() }
        }, matchWidth())
        content.addView(TextView(this).apply {
            text = getString(R.string.my_profile)
            textSize = 28f
            setTextColor(Color.rgb(20, 35, 29))
        }, matchWidth())
        avatarView = TextView(this).apply {
            text = "?"
            textSize = 28f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(169, 67, 50))
            contentDescription = getString(R.string.default_avatar)
        }
        content.addView(avatarView, LinearLayout.LayoutParams(120, 120).apply {
            topMargin = 24
            bottomMargin = 8
        })
        content.addView(TextView(this).apply {
            text = getString(R.string.profile_picture_not_supported)
            textSize = 12f
            setTextColor(Color.rgb(96, 112, 100))
        }, matchWidth())
        nameInput = field(R.string.full_name, InputType.TYPE_CLASS_TEXT)
        usernameView = field(R.string.username, InputType.TYPE_CLASS_TEXT).apply { isEnabled = false }
        emailInput = field(R.string.email, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS)
        phoneInput = field(R.string.phone_number, InputType.TYPE_CLASS_PHONE)
        roleView = field(R.string.role, InputType.TYPE_CLASS_TEXT).apply { isEnabled = false }
        statusView = TextView(this).apply {
            textSize = 16f
            setTextColor(Color.rgb(20, 35, 29))
            setPadding(0, 12, 0, 12)
        }
        createdView = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.rgb(96, 112, 100))
            setPadding(0, 8, 0, 8)
        }
        passwordInput = field(R.string.change_password, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD)
        confirmPasswordInput = field(R.string.confirm_new_password, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD)
        passwordToggle = Button(this).apply {
            text = getString(R.string.show_password)
            setOnClickListener { togglePasswordVisibility() }
        }
        listOf(nameInput, usernameView, emailInput, phoneInput, roleView, statusView, createdView, passwordInput, confirmPasswordInput, passwordToggle)
            .forEach(content::addView)
        content.addView(TextView(this).apply {
            text = getString(R.string.password_requirements_hint)
            textSize = 12f
            setTextColor(Color.rgb(96, 112, 100))
        }, matchWidth())
        saveButton = Button(this).apply {
            text = getString(R.string.save_profile)
            isEnabled = false
            setOnClickListener { saveProfile() }
        }
        content.addView(saveButton, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.logout)
            setOnClickListener { logout() }
        }, matchWidth())
        progressBar = ProgressBar(this).apply { visibility = View.GONE }
        content.addView(progressBar, matchWidth())
        messageView = TextView(this).apply { setPadding(0, 12, 0, 0) }
        content.addView(messageView, matchWidth())
        return ScrollView(this).apply { addView(content) }
    }

    private fun loadProfile() {
        setLoading(true)
        executor.execute {
            try {
                val profile = AuthenticationApiClient(BuildConfig.API_BASE_URL).getMyStaffProfile(token!!)
                runOnUiThread {
                    setLoading(false)
                    showProfile(profile)
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setLoading(false)
                    showError(error)
                }
            }
        }
    }

    private fun showProfile(profile: MobileAccountProfile) {
        avatarView.text = profile.name.firstOrNull()?.uppercase() ?: "?"
        nameInput.setText(profile.name)
        usernameView.setText(profile.username)
        emailInput.setText(profile.email)
        phoneInput.setText(profile.contactNumber)
        roleView.setText(if (profile.role == "GridOperator") "Grid Operator" else profile.role)
        statusView.text = getString(R.string.account_status_value, profile.accountStatus)
        createdView.text = getString(R.string.registration_date_value, profile.createdAtUtc.ifBlank { "—" })
        saveButton.isEnabled = true
    }

    private fun saveProfile() {
        val name = nameInput.text.toString().trim()
        val email = emailInput.text.toString().trim()
        val phone = phoneInput.text.toString().trim()
        val password = passwordInput.text.toString()
        val confirmation = confirmPasswordInput.text.toString()
        if (name.isBlank() || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches() || !isPhoneValid(phone)) {
            showErrorMessage(getString(R.string.profile_update_error))
            return
        }
        if (password.isNotEmpty() && (!isStrongPassword(password) || password != confirmation)) {
            showErrorMessage(getString(R.string.password_update_error))
            return
        }

        setLoading(true)
        executor.execute {
            try {
                val updated = AuthenticationApiClient(BuildConfig.API_BASE_URL).updateMyStaffProfile(
                    token!!, role, name, email, phone, password.takeIf(String::isNotEmpty)
                )
                runOnUiThread {
                    setLoading(false)
                    passwordInput.text.clear()
                    confirmPasswordInput.text.clear()
                    showProfile(updated)
                    messageView.setTextColor(Color.rgb(47, 126, 89))
                    messageView.text = getString(R.string.profile_updated)
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setLoading(false)
                    showError(error)
                }
            }
        }
    }

    private fun togglePasswordVisibility() {
        passwordVisible = !passwordVisible
        val inputType = InputType.TYPE_CLASS_TEXT or if (passwordVisible) {
            InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
        } else {
            InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        passwordInput.inputType = inputType
        confirmPasswordInput.inputType = inputType
        passwordInput.setSelection(passwordInput.text.length)
        confirmPasswordInput.setSelection(confirmPasswordInput.text.length)
        passwordToggle.text = getString(if (passwordVisible) R.string.hide_password else R.string.show_password)
    }

    private fun logout() {
        getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE).edit().clear().apply()
        returnToLogin()
    }

    private fun returnToLogin() {
        startActivity(android.content.Intent(this, MainActivity::class.java).addFlags(
            android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK or android.content.Intent.FLAG_ACTIVITY_NEW_TASK
        ))
        finish()
    }

    private fun showError(error: Exception) {
        val message = error.message ?: getString(R.string.profile_failed)
        if (message.contains("401", ignoreCase = true) || message.contains("expired", ignoreCase = true)
            || message.contains("inactive", ignoreCase = true)) {
            logout()
        } else {
            showErrorMessage(message)
        }
    }

    private fun showErrorMessage(message: String) {
        messageView.setTextColor(Color.rgb(160, 53, 43))
        messageView.text = message
    }

    private fun setLoading(loading: Boolean) {
        saveButton.isEnabled = !loading
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun field(label: Int, inputTypeValue: Int) = EditText(this).apply {
        hint = getString(label)
        inputType = inputTypeValue
        setSingleLine(true)
        layoutParams = matchWidth()
    }

    private fun isPhoneValid(value: String): Boolean {
        val digits = value.count(Char::isDigit)
        return Regex("^\\+?[0-9\\s().-]+$").matches(value) && digits in 7..15
    }

    private fun isStrongPassword(value: String): Boolean =
        value.length >= 8 && value.any(Char::isUpperCase) && value.any(Char::isLowerCase)
            && value.any(Char::isDigit) && value.any { !it.isLetterOrDigit() && !it.isWhitespace() }

    private fun matchWidth() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = 14 }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
