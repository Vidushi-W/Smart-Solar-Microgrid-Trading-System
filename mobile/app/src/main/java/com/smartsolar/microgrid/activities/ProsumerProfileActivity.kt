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
import com.smartsolar.microgrid.authentication.ProsumerProfile
import com.smartsolar.microgrid.authentication.UpdateProsumerProfileRequest
import java.util.concurrent.Executors

class ProsumerProfileActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var nicView: TextView
    private lateinit var statusView: TextView
    private lateinit var nameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var addressInput: EditText
    private lateinit var saveButton: Button
    private lateinit var messageView: TextView
    private var token: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        token = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.TOKEN_KEY, null)
        if (token.isNullOrBlank()) {
            finish()
            return
        }
        setContentView(createView())
        loadProfile()
    }

    private fun createView(): ScrollView {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        content.addView(TextView(this).apply {
            text = getString(R.string.my_profile)
            textSize = 28f
            setTextColor(Color.rgb(20, 35, 29))
        }, matchWidth())
        nicView = readOnlyField(R.string.nic)
        statusView = readOnlyField(R.string.account_status)
        nameInput = editableField(R.string.full_name, InputType.TYPE_CLASS_TEXT)
        emailInput = editableField(R.string.email, InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS)
        phoneInput = editableField(R.string.phone_number, InputType.TYPE_CLASS_PHONE)
        addressInput = editableField(R.string.address, InputType.TYPE_CLASS_TEXT, true)
        listOf(nicView, statusView, nameInput, emailInput, phoneInput, addressInput).forEach(content::addView)
        saveButton = Button(this).apply {
            text = getString(R.string.save_profile)
            isEnabled = false
            setOnClickListener { saveProfile() }
        }
        content.addView(saveButton, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.request_deactivation)
            setOnClickListener { requestDeactivation() }
        }, matchWidth())
        messageView = TextView(this).apply { setPadding(0, 16, 0, 0) }
        content.addView(messageView, matchWidth())
        return ScrollView(this).apply { addView(content) }
    }

    private fun loadProfile() {
        executor.execute {
            try {
                val profile = AuthenticationApiClient(BuildConfig.API_BASE_URL).getMyProfile(token!!)
                runOnUiThread { showProfile(profile) }
            } catch (error: Exception) {
                runOnUiThread { showError(error) }
            }
        }
    }

    private fun showProfile(profile: ProsumerProfile) {
        nicView.text = getString(R.string.nic_value, profile.nic)
        statusView.text = getString(R.string.account_status_value, profile.accountStatus)
        nameInput.setText(profile.name)
        emailInput.setText(profile.email)
        phoneInput.setText(profile.contactNumber)
        addressInput.setText(profile.address)
        saveButton.isEnabled = true
    }

    private fun saveProfile() {
        val request = UpdateProsumerProfileRequest(
            nameInput.text.toString().trim(),
            emailInput.text.toString().trim(),
            phoneInput.text.toString().trim(),
            addressInput.text.toString().trim()
        )
        saveButton.isEnabled = false
        executor.execute {
            try {
                val profile = AuthenticationApiClient(BuildConfig.API_BASE_URL).updateMyProfile(token!!, request)
                runOnUiThread {
                    showProfile(profile)
                    messageView.text = getString(R.string.profile_saved)
                }
            } catch (error: Exception) {
                runOnUiThread {
                    saveButton.isEnabled = true
                    showError(error)
                }
            }
        }
    }

    private fun requestDeactivation() {
        executor.execute {
            try {
                val response = AuthenticationApiClient(BuildConfig.API_BASE_URL).requestDeactivation(token!!)
                runOnUiThread { messageView.text = response }
            } catch (error: Exception) {
                runOnUiThread { showError(error) }
            }
        }
    }

    private fun showError(error: Exception) {
        messageView.setTextColor(Color.rgb(160, 53, 43))
        messageView.text = error.message ?: getString(R.string.profile_failed)
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
        singleLine = !multiline
        if (multiline) minLines = 3
        layoutParams = matchWidth()
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
