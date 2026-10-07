package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.result.contract.ActivityResultContracts
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
import com.smartsolar.microgrid.authentication.LocalAccountStore
import com.smartsolar.microgrid.authentication.ProsumerProfile
import com.smartsolar.microgrid.authentication.ProfilePictureCodec
import com.smartsolar.microgrid.authentication.UpdateProsumerProfileRequest
import android.util.Base64
import android.graphics.BitmapFactory
import java.util.concurrent.Executors

class ProsumerProfileActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var avatarView: TextView
    private lateinit var photoView: ImageView
    private lateinit var pictureButton: Button
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
    private var profilePictureData: String? = null
    private val picturePicker = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            executor.execute {
                try {
                    val data = ProfilePictureCodec.encodeJpeg(contentResolver, uri)
                    runOnUiThread {
                        profilePictureData = data
                        showAvatar(data)
                        showSuccess(getString(R.string.profile_picture_selected))
                    }
                } catch (error: Exception) {
                    runOnUiThread { showErrorMessage(error.message ?: getString(R.string.profile_failed)) }
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        token = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.TOKEN_KEY, null)
        if (token.isNullOrBlank()) {
            returnToLogin()
            return
        }
        setContentView(createView())
        showCachedAccount()
        loadProfile()
    }

    private fun showAvatar(data: String?) {
        if (data.isNullOrBlank()) {
            photoView.visibility = View.GONE
            avatarView.visibility = View.VISIBLE
            return
        }
        val encoded = data.substringAfter(',', "")
        val bytes = Base64.decode(encoded, Base64.DEFAULT)
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            ?: throw IllegalArgumentException("The selected profile photo could not be displayed.")
        photoView.setImageBitmap(bitmap)
        avatarView.visibility = View.GONE
        photoView.visibility = View.VISIBLE
    }

    private fun createView(): View {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 32, 40, 48)
            setBackgroundColor(getColor(R.color.solar_background))
        }
        content.addView(com.smartsolar.microgrid.ui.SolarUi.backBar(this), matchWidth())
        content.addView(TextView(this).apply {
            text = getString(R.string.my_profile)
            textSize = 28f
            setTextColor(getColor(R.color.solar_heading))
        }, matchWidth())
        avatarView = TextView(this).apply {
            text = "?"
            textSize = 28f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setBackgroundColor(getColor(R.color.solar_accent))
            contentDescription = getString(R.string.default_avatar)
        }
        content.addView(avatarView, LinearLayout.LayoutParams(96, 96).apply {
            topMargin = 20
            bottomMargin = 8
        })
        photoView = ImageView(this).apply {
            visibility = View.GONE
            scaleType = ImageView.ScaleType.CENTER_CROP
            contentDescription = getString(R.string.my_profile)
        }
        content.addView(photoView, LinearLayout.LayoutParams(96, 96).apply { bottomMargin = 8 })
        pictureButton = Button(this).apply {
            text = getString(R.string.choose_profile_picture)
            isEnabled = false
            setOnClickListener { picturePicker.launch("image/*") }
        }
        content.addView(pictureButton, matchWidth())
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
            com.smartsolar.microgrid.ui.SolarUi.primary(this)
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
                    pictureButton.isEnabled = !editing
                }
            } catch (error: Exception) {
                runOnUiThread {
                    setLoading(false)
                    handleApiError(error)
                }
            }
        }
    }

    private fun showCachedAccount() {
        val cached = LocalAccountStore(this).current() ?: return
        avatarView.text = cached.name.firstOrNull()?.uppercase() ?: "?"
        nicView.text = getString(R.string.nic_value, cached.nic)
        statusView.text = getString(R.string.account_status_value, cached.accountStatus)
        nameInput.setText(cached.name)
        emailInput.setText(cached.email)
        phoneInput.setText(cached.contactNumber)
        addressInput.setText(cached.address)
    }

    private fun showProfile(value: ProsumerProfile) {
        profile = value
        profilePictureData = value.profilePictureData
        showAvatar(profilePictureData)
        if (profilePictureData.isNullOrBlank()) {
            avatarView.text = value.name.firstOrNull()?.uppercase() ?: "?"
        }
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
        pictureButton.isEnabled = value
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
        val request = UpdateProsumerProfileRequest(name, email, phone, address, profilePictureData)
        setLoading(true)
        executor.execute {
            try {
                val updated = AuthenticationApiClient(BuildConfig.API_BASE_URL).updateMyProfile(token!!, request)
                LocalAccountStore(applicationContext).save(updated)
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
                    profile?.let {
                        LocalAccountStore(applicationContext).save(it)
                        showProfile(it)
                    }
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
        LocalAccountStore(applicationContext).clear()
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
        messageView.setTextColor(getColor(R.color.solar_success))
        messageView.text = message
    }

    private fun showErrorMessage(message: String) {
        messageView.setTextColor(getColor(R.color.solar_error))
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
        setTextColor(getColor(R.color.solar_muted))
        setPadding(0, 12, 0, 12)
        layoutParams = matchWidth()
    }

    private fun editableField(label: Int, inputTypeValue: Int, multiline: Boolean = false) = EditText(this).apply {
        hint = getString(label)
        inputType = inputTypeValue
        setSingleLine(!multiline)
        isEnabled = false
        if (multiline) minLines = 3
        com.smartsolar.microgrid.ui.SolarUi.field(this)
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
