package com.smartsolar.microgrid.activities

import android.content.Intent
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
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
import com.smartsolar.microgrid.authentication.ProsumerProfile
import com.smartsolar.microgrid.authentication.UpdateProsumerProfileRequest
import java.util.concurrent.Executors

class ProsumerProfileActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var avatarView: TextView
    private lateinit var nicView: TextView
    private lateinit var statusView: TextView
    private lateinit var registeredView: TextView
    private lateinit var nameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var addressInput: EditText
    private lateinit var saveButton: Button
    private lateinit var editButton: Button
    private lateinit var cancelButton: Button
    private lateinit var deactivationButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var messageView: TextView
    private var token: String? = null
    private var profile: ProsumerProfile? = null
    private var editing = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        token = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.TOKEN_KEY, null)
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
            setPadding(40, 32, 40, 48)
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
        content.addView(avatarView, LinearLayout.LayoutParams(96, 96).apply {
            topMargin = 20
            bottomMargin = 8
        })
        content.addView(TextView(this).apply {
            text = getString(R.string.profile_picture_not_supported)
            textSize = 12f
            setTextColor(Color.rgb(96, 112, 100))
        }, matchWidth())
        nicView = readOnlyField(R.string.nic)
        statusView = readOnlyField(R.string.account_status)
        registeredView = readOnlyField(R.string.registration_date)
        nameInput = editableField(R.string.full_name, InputType.TYPE_CLASS_TEXT)
        emailInput = editableField(R.string.email, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS)
        phoneInput = editableField(R.string.phone_number, InputType.TYPE_CLASS_PHONE)
        addressInput = editableField(R.string.address, InputType.TYPE_CLASS_TEXT, true)
        listOf(nicView, statusView, registeredView, nameInput, emailInput, phoneInput, addressInput).forEach(content::addView)
        editButton = Button(this).apply {
            text = getString(R.string.edit_profile)
            isEnabled = false
            setOnClickListener { setEditing(true) }
        }
        saveButton = Button(this).apply {
            text = getString(R.string.save_profile)
            visibility = View.GONE
            setOnClickListener { saveProfile() }
        }
        cancelButton = Button(this).apply {
            text = getString(R.string.cancel)
            visibility = View.GONE
            setOnClickListener {
                profile?.let(::showProfile)
                setEditing(false)
            }
        }
        deactivationButton = Button(this).apply {
            text = getString(R.string.request_deactivation)
            isEnabled = false
            setOnClickListener { confirmDeactivation() }
        }
        listOf(editButton, saveButton, cancelButton, deactivationButton).forEach { content.addView(it, matchWidth()) }
        content.addView(Button(this).apply {
            text = getString(R.string.logout)
            setOnClickListener { logout() }
        }, matchWidth())
        progressBar = ProgressBar(this).apply { visibility = View.GONE }
        content.addView(progressBar, matchWidth())
        messageView = TextView(this).apply { setPadding(0, 16, 0, 0) }
        content.addView(messageView, matchWidth())
        return ScrollView(this).apply { addView(content) }
    }

    private fun loadProfile() {
        setLoading(true)
        executor.execute {
            try {
                val result = AuthenticationApiClient(BuildConfig.API_BASE_URL).getMyProfile(token!!)
                runOnUiThread {
                    setLoading(false)
                    showProfile(result)
                    editButton.isEnabled = true
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setLoading(false)
                    handleApiError(error)
                }
            }
        }
    }

    private fun showProfile(value: ProsumerProfile) {
        profile = value
        avatarView.text = value.name.firstOrNull()?.uppercase() ?: "?"
        nicView.text = getString(R.string.nic_value, value.nic)
        statusView.text = getString(R.string.account_status_value, value.accountStatus)
        registeredView.text = getString(R.string.registration_date_value, value.createdAtUtc.ifBlank { "—" })
        nameInput.setText(value.name)
        emailInput.setText(value.email)
        phoneInput.setText(value.contactNumber)
        addressInput.setText(value.address)
        deactivationButton.isEnabled = value.accountStatus == "Active" && !editing
    }

    private fun setEditing(value: Boolean) {
        editing = value
        listOf(nameInput, emailInput, phoneInput, addressInput).forEach { it.isEnabled = value }
        editButton.visibility = if (value) View.GONE else View.VISIBLE
        saveButton.visibility = if (value) View.VISIBLE else View.GONE
        cancelButton.visibility = if (value) View.VISIBLE else View.GONE
        deactivationButton.isEnabled = !value && profile?.accountStatus == "Active"
    }

    private fun saveProfile() {
        val name = nameInput.text.toString().trim()
        val email = emailInput.text.toString().trim()
        val phone = phoneInput.text.toString().trim()
        val address = addressInput.text.toString().trim()
        if (name.isBlank() || email.isBlank() || phone.isBlank() || address.isBlank()
            || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches() || !isPhoneValid(phone)) {
            showErrorMessage(getString(R.string.profile_update_error))
            return
        }
        val request = UpdateProsumerProfileRequest(name, email, phone, address)
        setLoading(true)
        executor.execute {
            try {
                val updated = AuthenticationApiClient(BuildConfig.API_BASE_URL).updateMyProfile(token!!, request)
                runOnUiThread {
                    setLoading(false)
                    showProfile(updated)
                    setEditing(false)
                    showSuccess(getString(R.string.profile_updated))
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setLoading(false)
                    handleApiError(error)
                }
            }
        }
    }

    private fun confirmDeactivation() {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.deactivation_confirmation_title))
            .setMessage("${getString(R.string.deactivation_explanation)}\n\n${getString(R.string.deactivation_confirmation_message)}")
            .setNegativeButton(R.string.cancel, null)
            .setPositiveButton(R.string.confirm) { _, _ -> requestDeactivation() }
            .show()
    }

    private fun requestDeactivation() {
        setLoading(true)
        executor.execute {
            try {
                val updatedStatus = AuthenticationApiClient(BuildConfig.API_BASE_URL).requestDeactivation(token!!)
                runOnUiThread {
                    setLoading(false)
                    profile = profile?.copy(accountStatus = updatedStatus)
                    profile?.let(::showProfile)
                    deactivationButton.isEnabled = false
                    showSuccess(getString(R.string.deactivation_requested))
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setLoading(false)
                    handleApiError(error)
                }
            }
        }
    }

    private fun logout() {
        getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE).edit().clear().apply()
        returnToLogin()
    }

    private fun returnToLogin() {
        startActivity(Intent(this, MainActivity::class.java).addFlags(
            Intent.FLAG_ACTIVITY_CLEAR_TASK or Intent.FLAG_ACTIVITY_NEW_TASK
        ))
        finish()
    }

    private fun handleApiError(error: Exception) {
        val message = error.message ?: getString(R.string.profile_failed)
        if (message.contains("401", ignoreCase = true) || message.contains("expired", ignoreCase = true)
            || message.contains("inactive", ignoreCase = true)) {
            logout()
        } else {
            showErrorMessage(message)
        }
    }

    private fun showSuccess(message: String) {
        messageView.setTextColor(Color.rgb(47, 126, 89))
        messageView.text = message
    }

    private fun showErrorMessage(message: String) {
        messageView.setTextColor(Color.rgb(160, 53, 43))
        messageView.text = message
    }

    private fun setLoading(loading: Boolean) {
        editButton.isEnabled = !loading
        saveButton.isEnabled = !loading
        deactivationButton.isEnabled = !loading && !editing && profile?.accountStatus == "Active"
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
    }

    private fun readOnlyField(label: Int) = TextView(this).apply {
        text = getString(label)
        textSize = 16f
        setTextColor(Color.rgb(96, 112, 100))
        setPadding(0, 12, 0, 12)
        layoutParams = matchWidth()
    }

    private fun editableField(label: Int, inputTypeValue: Int, multiline: Boolean = false) = EditText(this).apply {
        hint = getString(label)
        inputType = inputTypeValue
        setSingleLine(!multiline)
        isEnabled = false
        if (multiline) minLines = 3
        layoutParams = matchWidth()
    }

    private fun isPhoneValid(value: String): Boolean {
        val digits = value.count(Char::isDigit)
        return Regex("^\\+?[0-9\\s().-]+$").matches(value) && digits in 7..15
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
