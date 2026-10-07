package com.smartsolar.microgrid.activities

import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
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
import com.smartsolar.microgrid.authentication.RegisterProsumerRequest
import com.smartsolar.microgrid.ui.SolarUi
import java.util.concurrent.Executors

class RegisterProsumerActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var nicInput: EditText
    private lateinit var fullNameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var addressInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var confirmPasswordInput: EditText
    private lateinit var registerButton: Button
    private lateinit var messageView: TextView
    private lateinit var progressBar: ProgressBar
    private var passwordVisible = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(createView())
    }

    private fun createView(): ScrollView {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(48, 48, 48, 48)
            setBackgroundColor(getColor(R.color.solar_background))
        }
        content.addView(com.smartsolar.microgrid.ui.SolarUi.backBar(this), matchWidth())
        content.addView(TextView(this).apply {
            text = getString(R.string.prosumer_registration)
            textSize = 26f
            setTextColor(getColor(R.color.solar_heading))
            gravity = Gravity.CENTER
        }, matchWidth())
        content.addView(TextView(this).apply {
            text = getString(R.string.registration_subtitle)
            textSize = 15f
            setTextColor(getColor(R.color.solar_muted))
            setPadding(0, 12, 0, 24)
            gravity = Gravity.CENTER
        }, matchWidth())

        nicInput = field(R.string.nic, InputType.TYPE_CLASS_TEXT)
        fullNameInput = field(R.string.full_name, InputType.TYPE_CLASS_TEXT)
        emailInput = field(R.string.email, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS)
        phoneInput = field(R.string.phone_number, InputType.TYPE_CLASS_PHONE)
        addressInput = field(R.string.address, InputType.TYPE_CLASS_TEXT, multiline = true)
        passwordInput = field(R.string.password, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD)
        confirmPasswordInput = field(R.string.confirm_password, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD)
        listOf(nicInput, fullNameInput, emailInput, phoneInput, addressInput, passwordInput, confirmPasswordInput)
            .forEach(content::addView)
        content.addView(Button(this).apply {
            text = getString(R.string.show_password)
            setOnClickListener {
                passwordVisible = !passwordVisible
                val type = InputType.TYPE_CLASS_TEXT or if (passwordVisible) {
                    InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                } else {
                    InputType.TYPE_TEXT_VARIATION_PASSWORD
                }
                passwordInput.inputType = type
                confirmPasswordInput.inputType = type
                passwordInput.setSelection(passwordInput.text.length)
                confirmPasswordInput.setSelection(confirmPasswordInput.text.length)
                text = getString(if (passwordVisible) R.string.hide_password else R.string.show_password)
            }
        }, matchWidth())
        content.addView(TextView(this).apply {
            text = getString(R.string.password_requirements_hint)
            textSize = 12f
            setTextColor(getColor(R.color.solar_muted))
            setPadding(0, 0, 0, 12)
        }, matchWidth())

        registerButton = Button(this).apply {
            text = getString(R.string.register)
            com.smartsolar.microgrid.ui.SolarUi.primary(this)
            setOnClickListener { submitRegistration() }
        }
        progressBar = ProgressBar(this).apply { visibility = android.view.View.GONE }
        content.addView(registerButton, matchWidth())
        content.addView(progressBar, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.back_to_login)
            setOnClickListener { finish() }
        }, matchWidth())
        messageView = TextView(this).apply {
            setTextColor(getColor(R.color.solar_error))
            setPadding(0, 16, 0, 0)
            gravity = Gravity.CENTER
        }
        content.addView(messageView, matchWidth())
        return ScrollView(this).apply { addView(content) }
    }

    private fun field(label: Int, inputTypeValue: Int, multiline: Boolean = false) = EditText(this).apply {
        hint = getString(label)
        inputType = inputTypeValue
        setSingleLine(!multiline)
        if (multiline) minLines = 3
        SolarUi.field(this)
    }.also { it.layoutParams = matchWidth() }

    private fun submitRegistration() {
        val request = RegisterProsumerRequest(
            nicInput.text.toString().trim(),
            fullNameInput.text.toString().trim(),
            emailInput.text.toString().trim(),
            phoneInput.text.toString().trim(),
            addressInput.text.toString().trim(),
            passwordInput.text.toString(),
            confirmPasswordInput.text.toString()
        )
        if (listOf(request.nic, request.fullName, request.email, request.phoneNumber, request.address, request.password, request.confirmPassword)
                .any(String::isBlank)) {
            showError(getString(R.string.registration_required))
            return
        }
        if (!Regex("^(?:[0-9]{12}|[0-9]{9}[VvXx])$").matches(request.nic)) {
            showError(getString(R.string.invalid_nic))
            return
        }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(request.email).matches()) {
            showError(getString(R.string.invalid_email))
            return
        }
        val phoneDigits = request.phoneNumber.count(Char::isDigit)
        if (!Regex("^\\+?[0-9\\s().-]+$").matches(request.phoneNumber) || phoneDigits !in 7..15) {
            showError(getString(R.string.invalid_phone))
            return
        }
        if (request.password != request.confirmPassword) {
            messageView.text = getString(R.string.passwords_do_not_match)
            return
        }
        if (!isStrongPassword(request.password)) {
            showError(getString(R.string.password_requirements_error))
            return
        }

        setLoading(true)
        messageView.setTextColor(getColor(R.color.solar_muted))
        messageView.text = getString(R.string.registering)
        executor.execute {
            try {
                val response = AuthenticationApiClient(BuildConfig.API_BASE_URL).register(request)
                runOnUiThread {
                    setLoading(false)
                    messageView.setTextColor(getColor(R.color.solar_success))
                    messageView.text = if (response.accountStatus == "PendingActivation") {
                        getString(R.string.registration_pending)
                    } else {
                        response.message
                    }
                    registerButton.isEnabled = false
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setLoading(false)
                    showError(error.message ?: getString(R.string.registration_failed))
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        registerButton.isEnabled = !loading
        progressBar.visibility = if (loading) android.view.View.VISIBLE else android.view.View.GONE
    }

    private fun showError(message: String) {
        messageView.setTextColor(getColor(R.color.solar_error))
        messageView.text = message
    }

    private fun isStrongPassword(password: String): Boolean =
        password.length >= 8
            && password.any(Char::isUpperCase)
            && password.any(Char::isLowerCase)
            && password.any(Char::isDigit)
            && password.any { !it.isLetterOrDigit() && !it.isWhitespace() }

    private fun matchWidth() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = 16 }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
