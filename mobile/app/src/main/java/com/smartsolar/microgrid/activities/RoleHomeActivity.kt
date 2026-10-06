package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Bundle
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.ReservationApiClient
import com.smartsolar.microgrid.api.MicrogridApi
import com.smartsolar.microgrid.authentication.AuthenticationApiClient
import com.smartsolar.microgrid.authentication.MobileAccountProfile
import java.util.concurrent.Executors

class RoleHomeActivity : AppCompatActivity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var welcomeView: TextView
    private lateinit var nicView: TextView
    private lateinit var statusView: TextView
    private lateinit var avatarView: TextView
    private lateinit var photoView: ImageView
    private lateinit var messageView: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var activeCountView: TextView
    private lateinit var pendingCountView: TextView
    private lateinit var historyCountView: TextView
    private lateinit var operationalCountView: TextView
    private var role: String? = null
    private var sessionCheckRunning = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        role = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.ROLE_KEY, null)
        if (role != "Prosumer" && role != "GridOperator") {
            returnToLogin()
            return
        }
        setContentView(createHome())
    }

    override fun onStart() {
        super.onStart()
        validateSession()
    }

    private fun createHome(): View {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 36, 40, 48)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        val isProsumer = role == "Prosumer"
        content.addView(TextView(this).apply {
            text = if (isProsumer) getString(R.string.prosumer_home) else getString(R.string.operator_home)
            textSize = 28f
            setTextColor(Color.rgb(20, 35, 29))
        }, matchWidth())
        val avatar = FrameLayout(this).apply {
            contentDescription = getString(R.string.default_avatar)
        }
        avatarView = TextView(this).apply {
            text = "?"
            textSize = 28f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(169, 67, 50))
        }
        avatar.addView(avatarView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        photoView = ImageView(this).apply {
            visibility = View.GONE
            scaleType = ImageView.ScaleType.CENTER_CROP
            contentDescription = getString(R.string.my_profile)
        }
        avatar.addView(photoView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        content.addView(avatar, LinearLayout.LayoutParams(88, 88).apply {
            topMargin = 22
            bottomMargin = 8
        })
        welcomeView = TextView(this).apply {
            textSize = 20f
            setTextColor(Color.rgb(20, 35, 29))
        }
        content.addView(welcomeView, matchWidth())
        if (isProsumer) {
            nicView = TextView(this).apply {
                textSize = 15f
                setTextColor(Color.rgb(96, 112, 100))
                setPadding(0, 6, 0, 0)
            }
            content.addView(nicView, matchWidth())
        }
        statusView = TextView(this).apply {
            textSize = 15f
            setTextColor(Color.rgb(96, 112, 100))
            setPadding(0, 6, 0, 20)
        }
        content.addView(statusView, matchWidth())

        if (isProsumer) {
            content.addView(sectionTitle(R.string.account_summary), matchWidth())
            activeCountView = summaryCard(R.string.active_reservations) {
                openReservations(ReservationListActivity.MODE_UPCOMING)
            }
            pendingCountView = summaryCard(R.string.pending_bookings) {
                openReservations(ReservationListActivity.MODE_UPCOMING)
            }
            historyCountView = summaryCard(R.string.booking_history) {
                openReservations(ReservationListActivity.MODE_HISTORY)
            }
            content.addView(activeCountView, matchWidth())
            content.addView(pendingCountView, matchWidth())
            content.addView(historyCountView, matchWidth())
            content.addView(sectionTitle(R.string.quick_actions), matchWidth())
            content.addView(Button(this).apply {
                text = getString(R.string.find_book_energy)
                setOnClickListener { startActivity(Intent(this@RoleHomeActivity, CreateReservationActivity::class.java)) }
            }, matchWidth())
            content.addView(Button(this).apply {
                text = getString(R.string.my_bookings)
                setOnClickListener { openReservations(ReservationListActivity.MODE_UPCOMING) }
            }, matchWidth())
            content.addView(Button(this).apply {
                text = getString(R.string.booking_history)
                setOnClickListener { openReservations(ReservationListActivity.MODE_HISTORY) }
            }, matchWidth())
            addPlaceholderAction(content, R.string.nearby_grid_nodes)
            content.addView(Button(this).apply {
                text = getString(R.string.my_profile)
                setOnClickListener { startActivity(Intent(this@RoleHomeActivity, ProsumerProfileActivity::class.java)) }
            }, matchWidth())
            content.addView(Button(this).apply {
                text = getString(R.string.account_settings)
                setOnClickListener { startActivity(Intent(this@RoleHomeActivity, ProsumerProfileActivity::class.java)) }
            }, matchWidth())
        } else {
            content.addView(sectionTitle(R.string.operator_navigation), matchWidth())
            content.addView(Button(this).apply {
                text = getString(R.string.operator_bookings)
                setOnClickListener { openReservations(ReservationListActivity.MODE_STAFF) }
            }, matchWidth())
            content.addView(Button(this).apply {
                text = getString(R.string.qr_scanner)
                setOnClickListener { startActivity(Intent(this@RoleHomeActivity, QrScannerActivity::class.java)) }
            }, matchWidth())
            content.addView(Button(this).apply {
                text = getString(R.string.energy_transfer)
                setOnClickListener { startActivity(Intent(this@RoleHomeActivity, QrScannerActivity::class.java)) }
            }, matchWidth())
            content.addView(Button(this).apply {
                text = getString(R.string.my_profile)
                setOnClickListener { startActivity(Intent(this@RoleHomeActivity, StaffProfileActivity::class.java)) }
            }, matchWidth())
        }
        content.addView(sectionTitle(R.string.reservations), matchWidth())
        operationalCountView = TextView(this).apply {
            setTextColor(Color.rgb(96, 112, 100))
        }
        content.addView(operationalCountView, matchWidth())
        listOf(
            R.string.reservations to "",
            R.string.requested_reservations to "Requested",
            R.string.approved_reservations to "Approved",
            R.string.scheduled_reservations to "Scheduled"
        ).forEach { (label, status) ->
            content.addView(Button(this).apply {
                text = getString(label)
                setOnClickListener {
                    startActivity(Intent(this@RoleHomeActivity, ReservationsActivity::class.java)
                        .putExtra("status", status))
                }
            }, matchWidth())
        }
        content.addView(Button(this).apply {
            text = getString(R.string.booking_history)
            setOnClickListener {
                startActivity(Intent(this@RoleHomeActivity, ReservationsActivity::class.java)
                    .putExtra("history", true).putExtra("status", "Completed"))
            }
        }, matchWidth())
        if (isProsumer) content.addView(Button(this).apply {
            text = getString(R.string.create_reservation)
            setOnClickListener { startActivity(Intent(this@RoleHomeActivity, ReservationFormActivity::class.java)) }
        }, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.retry)
            setOnClickListener { validateSession() }
        }, matchWidth())
        messageView = TextView(this).apply {
            setTextColor(Color.rgb(160, 53, 43))
            setPadding(0, 16, 0, 0)
        }
        content.addView(messageView, matchWidth())
        progressBar = ProgressBar(this).apply { visibility = View.GONE }
        content.addView(progressBar, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.logout)
            setOnClickListener { logout() }
        }, matchWidth())
        return ScrollView(this).apply { addView(content) }
    }

    private fun validateSession() {
        if (sessionCheckRunning || isFinishing) return
        val token = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.TOKEN_KEY, null)
        if (token.isNullOrBlank()) {
            returnToLogin()
            return
        }
        sessionCheckRunning = true
        progressBar.visibility = View.VISIBLE
        executor.execute {
            try {
                val api = AuthenticationApiClient(BuildConfig.API_BASE_URL)
                val user = api.getCurrentUser(token)
                val expectedRole = if (role == "Prosumer") "Prosumer" else "GridOperator"
                if (user.role.name.toApiRole() != expectedRole) {
                    throw SecurityException(getString(R.string.forbidden_role))
                }
                val profile = if (role == "Prosumer") api.getMyProsumerAccount(token) else api.getMyStaffProfile(token)
                val counts = if (role == "Prosumer") runCatching { reservationCounts(token) } else null
                val operationalCounts = runCatching { MicrogridApi(this).dashboard() }
                runOnUiThread {
                    if (isFinishing) return@runOnUiThread
                    showProfile(profile)
                    operationalCounts.onSuccess { summary ->
                        operationalCountView.text = getString(R.string.dashboard_counts,
                            summary.getInt("pending"), summary.getInt("approvedFuture"), summary.getInt("dueSoon"))
                    }.onFailure { error ->
                        operationalCountView.text = error.message ?: getString(R.string.api_error)
                    }
                    counts?.onSuccess { (active, pending, history) ->
                        activeCountView.text = getString(R.string.count_value, getString(R.string.active_reservations), active)
                        pendingCountView.text = getString(R.string.count_value, getString(R.string.pending_bookings), pending)
                        historyCountView.text = getString(R.string.count_value, getString(R.string.booking_history), history)
                    }?.onFailure { error ->
                        messageView.text = error.message ?: getString(R.string.api_error)
                    }
                    progressBar.visibility = View.GONE
                    sessionCheckRunning = false
                }
            } catch (error: Exception) {
                runOnUiThread {
                    if (isFinishing) return@runOnUiThread
                    progressBar.visibility = View.GONE
                    sessionCheckRunning = false
                    if (error.message?.contains("inactive", ignoreCase = true) == true
                        || error.message?.contains("401", ignoreCase = true) == true
                        || error.message?.contains("expired", ignoreCase = true) == true) {
                        logout()
                    } else {
                        messageView.text = error.message ?: getString(R.string.api_error)
                    }
                }
            }
        }
    }

    private fun showProfile(profile: MobileAccountProfile) {
        avatarView.text = profile.name.firstOrNull()?.uppercase() ?: "?"
        val image = profile.profilePictureData
            ?.substringAfter(',', "")
            ?.let { encoded ->
                try {
                    val bytes = Base64.decode(encoded, Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                } catch (_: IllegalArgumentException) {
                    null
                }
            }
        if (image != null) {
            photoView.setImageBitmap(image)
            photoView.visibility = View.VISIBLE
            avatarView.visibility = View.GONE
        } else {
            photoView.setImageDrawable(null)
            photoView.visibility = View.GONE
            avatarView.visibility = View.VISIBLE
        }
        welcomeView.text = getString(R.string.welcome_user, profile.name)
        if (role == "Prosumer") {
            nicView.text = getString(R.string.nic_value, profile.nic)
        }
        statusView.text = getString(R.string.account_status_value, profile.accountStatus)
    }

    private fun reservationCounts(token: String): Triple<Int, Int, Int> {
        val rows = ReservationApiClient(BuildConfig.API_BASE_URL).myReservations(token)
        val active = rows.count { it.status == "Pending" || it.status == "Approved" }
        val pending = rows.count { it.status == "Pending" }
        val history = rows.count { it.status == "Completed" || it.status == "Cancelled" }
        return Triple(active, pending, history)
    }

    private fun openReservations(mode: String) {
        startActivity(Intent(this, ReservationListActivity::class.java)
            .putExtra(ReservationListActivity.MODE_KEY, mode))
    }

    private fun addPlaceholderAction(parent: LinearLayout, label: Int) {
        parent.addView(Button(this).apply {
            text = getString(label)
            setOnClickListener { openModule(label) }
        }, matchWidth())
    }

    private fun summaryCard(label: Int, onOpen: () -> Unit) = TextView(this).apply {
        text = "${getString(label)}\n${getString(R.string.not_connected)}"
        textSize = 15f
        setTextColor(Color.rgb(96, 112, 100))
        setPadding(18, 16, 18, 16)
        setBackgroundColor(Color.WHITE)
        isClickable = true
        isFocusable = true
        setOnClickListener { onOpen() }
        layoutParams = matchWidth()
    }

    private fun openModule(destination: Int) {
        startActivity(Intent(this, ModulePlaceholderActivity::class.java)
            .putExtra(ModulePlaceholderActivity.TITLE_KEY, getString(destination)))
    }

    private fun sectionTitle(label: Int) = TextView(this).apply {
        text = getString(label)
        textSize = 19f
        setTextColor(Color.rgb(20, 35, 29))
        setPadding(0, 22, 0, 10)
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

    private fun String.toApiRole(): String = when (this) {
        "PROSUMER" -> "Prosumer"
        "GRID_OPERATOR" -> "GridOperator"
        "BACKOFFICE" -> "Backoffice"
        else -> this
    }

    private fun matchWidth() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = 12 }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
