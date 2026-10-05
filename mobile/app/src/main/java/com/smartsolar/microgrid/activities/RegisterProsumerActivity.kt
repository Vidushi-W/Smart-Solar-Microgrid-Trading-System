package com.smartsolar.microgrid.activities

import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
import com.smartsolar.microgrid.authentication.RegisterProsumerRequest
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(createView())
    }

    private fun createView(): ScrollView {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        content.addView(TextView(this).apply {
            text = getString(R.string.prosumer_registration)
            textSize = 26f
            setTextColor(Color.rgb(20, 35, 29))
            gravity = Gravity.CENTER
        }, matchWidth())
        content.addView(TextView(this).apply {
            text = getString(R.string.registration_subtitle)
            textSize = 15f
            setTextColor(Color.rgb(96, 112, 100))
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

        registerButton = Button(this).apply {
            text = getString(R.string.register)
            setOnClickListener { submitRegistration() }
        }
        content.addView(registerButton, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.back_to_login)
            setOnClickListener { finish() }
        }, matchWidth())
        messageView = TextView(this).apply {
            setTextColor(Color.rgb(160, 53, 43))
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
        if (request.password != request.confirmPassword) {
            messageView.text = getString(R.string.passwords_do_not_match)
            return
        }

        registerButton.isEnabled = false
        messageView.setTextColor(Color.rgb(96, 112, 100))
        messageView.text = getString(R.string.registering)
        executor.execute {
            try {
                val response = AuthenticationApiClient(BuildConfig.API_BASE_URL).register(request)
                runOnUiThread {
                    messageView.setTextColor(Color.rgb(47, 126, 89))
                    messageView.text = response.message
                    registerButton.isEnabled = false
                }
            } catch (error: Exception) {
                runOnUiThread {
                    registerButton.isEnabled = true
                    messageView.setTextColor(Color.rgb(160, 53, 43))
                    messageView.text = error.message ?: getString(R.string.registration_failed)
                }
            }
        }
    }

    private fun matchWidth() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = 16 }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
