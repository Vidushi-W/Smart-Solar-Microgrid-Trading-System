package com.smartsolar.microgrid.activities

import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
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
import com.smartsolar.microgrid.authentication.LocalAccountStore
import com.smartsolar.microgrid.authentication.MobileAccountProfile
import com.smartsolar.microgrid.models.ReservationRecord
import com.smartsolar.microgrid.models.StationRecord
import com.smartsolar.microgrid.models.stationLabel
import com.smartsolar.microgrid.models.utcDate
import com.smartsolar.microgrid.models.utcTime
import java.time.LocalDate
import java.time.ZoneOffset
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
    private lateinit var weekCountView: TextView
    private lateinit var recentList: LinearLayout
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
        LocalAccountStore(this).current()?.let(::showProfile)
    }

    override fun onStart() {
        super.onStart()
        validateSession()
    }

    private fun createHome(): View {
        if (role == "Prosumer") return createProsumerHome()
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(40, 36, 40, 48)
            setBackgroundColor(getColor(R.color.solar_background))
        }
        content.addView(TextView(this).apply {
            text = getString(R.string.operator_home)
            textSize = 28f
            setTextColor(getColor(R.color.solar_heading))
        }, matchWidth())
        val avatar = FrameLayout(this).apply {
            contentDescription = getString(R.string.default_avatar)
        }
        avatarView = TextView(this).apply {
            text = "?"
            textSize = 28f
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setBackgroundColor(getColor(R.color.solar_accent))
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
            setTextColor(getColor(R.color.solar_heading))
        }
        content.addView(welcomeView, matchWidth())
        statusView = TextView(this).apply {
            textSize = 15f
            setTextColor(getColor(R.color.solar_muted))
            setPadding(0, 6, 0, 20)
        }
        content.addView(statusView, matchWidth())
        addDashboardStats(content, prosumer = false)
        content.addView(sectionTitle(R.string.recent_bookings), matchWidth())
        recentList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        content.addView(recentList, matchWidth())
        content.addView(sectionTitle(R.string.operator_navigation), matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.operator_bookings)
            setOnClickListener { openReservations(ReservationListActivity.MODE_STAFF) }
        }, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.qr_scanner)
            setOnClickListener { startActivity(Intent(this@RoleHomeActivity, QrScanActivity::class.java)) }
        }, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.energy_transfer)
            setOnClickListener { startActivity(Intent(this@RoleHomeActivity, QrScanActivity::class.java)) }
        }, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.nearby_grid_nodes)
            setOnClickListener { startActivity(Intent(this@RoleHomeActivity, StationMapActivity::class.java)) }
        }, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.my_profile)
            setOnClickListener { startActivity(Intent(this@RoleHomeActivity, StaffProfileActivity::class.java)) }
        }, matchWidth())
        content.addView(sectionTitle(R.string.reservations), matchWidth())
        operationalCountView = TextView(this).apply {
            setTextColor(getColor(R.color.solar_muted))
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
        content.addView(Button(this).apply {
            text = getString(R.string.retry)
            setOnClickListener { validateSession() }
        }, matchWidth())
        messageView = TextView(this).apply {
            setTextColor(getColor(R.color.solar_error))
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

    private fun createProsumerHome(): View {
        val page = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(getColor(R.color.solar_background))
            setPadding(0, 0, 0, dp(28))
        }
        page.addView(prosumerHero())
        val body = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(20), dp(20), 0)
        }
        body.addView(sectionTitle(R.string.your_energy).apply { setPadding(0, 0, 0, dp(10)) })
        addDashboardStats(body, prosumer = true)
        body.addView(sectionTitle(R.string.recent_bookings))
        recentList = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        body.addView(recentList, matchWidth())

        body.addView(sectionTitle(R.string.quick_actions))
        actionRow(body, R.string.my_bookings) { openReservations(ReservationListActivity.MODE_UPCOMING) }
        actionRow(body, R.string.booking_history) { openReservations(ReservationListActivity.MODE_HISTORY) }
        actionRow(body, R.string.nearby_grid_nodes) {
            startActivity(Intent(this, StationMapActivity::class.java))
        }
        actionRow(body, R.string.create_reservation) {
            startActivity(Intent(this, ReservationFormActivity::class.java))
        }
        actionRow(body, R.string.my_profile) {
            startActivity(Intent(this, ProsumerProfileActivity::class.java))
        }

        messageView = TextView(this).apply {
            setTextColor(getColor(R.color.solar_error))
            setPadding(0, dp(8), 0, 0)
        }
        body.addView(messageView, matchWidth())
        progressBar = ProgressBar(this).apply { visibility = View.GONE }
        body.addView(progressBar, matchWidth())
        actionRow(body, R.string.retry) { validateSession() }
        body.addView(accentButton(getString(R.string.logout), false) { logout() })
        page.addView(body, matchWidth())
        return ScrollView(this).apply {
            isFillViewport = true
            addView(page)
        }
    }

    private fun prosumerHero(): View {
        val hero = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(28), dp(22), dp(26))
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(
                    getColor(R.color.solar_hero_start),
                    getColor(R.color.solar_hero_mid),
                    getColor(R.color.solar_hero_end)
                )
            )
        }
        hero.addView(TextView(this).apply {
            text = getString(R.string.prosumer_kicker)
            textSize = 11f
            letterSpacing = 0.12f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.parseColor("#FFC15F"))
        })
        val wordmark = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        wordmark.addView(TextView(this).apply {
            text = "Solar"
            textSize = 28f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
        })
        wordmark.addView(TextView(this).apply {
            text = "Grid"
            textSize = 28f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(getColor(R.color.solar_gold))
        })
        hero.addView(wordmark, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(8) })
        hero.addView(TextView(this).apply {
            text = getString(R.string.prosumer_home)
            textSize = 14f
            setTextColor(Color.parseColor("#F8E4DC"))
            setPadding(0, dp(4), 0, dp(18))
        })

        val identity = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val avatar = FrameLayout(this).apply {
            contentDescription = getString(R.string.default_avatar)
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setOval(0, 0, view.width, view.height)
                }
            }
            clipToOutline = true
        }
        avatarView = TextView(this).apply {
            text = "?"
            textSize = 22f
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#E7643C"))
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
        identity.addView(avatar, LinearLayout.LayoutParams(dp(64), dp(64)))
        val names = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        welcomeView = TextView(this).apply {
            text = getString(R.string.welcome_user, "…")
            textSize = 20f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
        }
        nicView = TextView(this).apply {
            textSize = 13f
            setTextColor(Color.parseColor("#F6D7CC"))
            setPadding(0, dp(2), 0, 0)
        }
        statusView = TextView(this).apply {
            textSize = 12f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.parseColor("#1B6F62"))
            setPadding(dp(10), dp(4), dp(10), dp(4))
            background = rounded(Color.parseColor("#E0EFEA"), 20)
        }
        names.addView(welcomeView)
        names.addView(nicView)
        names.addView(statusView, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(8) })
        identity.addView(names, LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        ).apply { marginStart = dp(14) })
        hero.addView(identity)
        hero.addView(Button(this).apply {
            text = getString(R.string.reserve_energy)
            isAllCaps = false
            textSize = 17f
            setTypeface(typeface, Typeface.BOLD)
            minHeight = dp(56)
            setTextColor(getColor(R.color.solar_gold_ink))
            backgroundTintList = null
            stateListAnimator = null
            background = rounded(getColor(R.color.solar_gold), 6)
            setOnClickListener {
                startActivity(Intent(this@RoleHomeActivity, CreateReservationActivity::class.java))
            }
        }, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(22) })
        hero.addView(TextView(this).apply {
            text = getString(R.string.reserve_energy_hint)
            textSize = 13f
            setTextColor(Color.parseColor("#FFF1DE"))
            setPadding(dp(2), dp(8), dp(2), 0)
        })
        return hero
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
                val bookings = runCatching { loadBookings(token) }
                val operationalCounts = if (role == "Prosumer") null else runCatching { MicrogridApi(this).dashboard() }
                runOnUiThread {
                    if (isFinishing) return@runOnUiThread
                    showProfile(profile)
                    operationalCounts?.onSuccess { summary ->
                        operationalCountView.text = getString(R.string.dashboard_counts,
                            summary.getInt("pending"), summary.getInt("approvedFuture"), summary.getInt("dueSoon"))
                    }?.onFailure { error ->
                        operationalCountView.text = error.message ?: getString(R.string.api_error)
                    }
                    bookings.onSuccess { summary ->
                        activeCountView.text = summary.first.toString()
                        pendingCountView.text = summary.second.toString()
                        historyCountView.text = summary.third.toString()
                        weekCountView.text = summary.fourth.toString()
                        renderRecent(summary.recent, summary.stations)
                    }.onFailure { error ->
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

    private data class HomeBookings(
        val first: Int,
        val second: Int,
        val third: Int,
        val fourth: Int,
        val recent: List<ReservationRecord>,
        val stations: List<StationRecord>
    )

    private fun loadBookings(token: String): HomeBookings {
        val api = ReservationApiClient(BuildConfig.API_BASE_URL)
        val stations = runCatching { api.stations(token) }.getOrDefault(emptyList())
        val rows = if (role == "Prosumer") api.myReservations(token) else api.allReservations(token)
        val recent = rows.sortedByDescending { it.createdAtUtc }.take(6)
        return if (role == "Prosumer") {
            HomeBookings(
                rows.count { it.status == "Pending" || it.status == "Approved" },
                rows.count { it.status == "Completed" },
                rows.count { it.status == "Cancelled" },
                weekCount(rows),
                recent,
                stations
            )
        } else {
            HomeBookings(
                rows.count { it.status == "Pending" },
                rows.count { it.status == "Approved" },
                rows.count { it.status == "Completed" },
                rows.count { it.status == "Cancelled" },
                recent,
                stations
            )
        }
    }

    private fun weekCount(rows: List<ReservationRecord>): Int {
        val today = LocalDate.now(ZoneOffset.UTC)
        val monday = today.minusDays(((today.dayOfWeek.value + 6) % 7).toLong())
        val sunday = monday.plusDays(6)
        return rows.count { row ->
            val day = runCatching { LocalDate.parse(row.scheduledAtUtc.take(10)) }.getOrNull() ?: return@count false
            !day.isBefore(monday) && !day.isAfter(sunday)
        }
    }

    private fun addDashboardStats(parent: LinearLayout, prosumer: Boolean) {
        val top = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val bottom = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        if (prosumer) {
            activeCountView = statCard(top, R.string.upcoming_reservations, true) {
                openReservations(ReservationListActivity.MODE_UPCOMING)
            }
            pendingCountView = statCard(top, R.string.completed_reservations, false) {
                openReservations(ReservationListActivity.MODE_HISTORY)
            }
            historyCountView = statCard(bottom, R.string.cancelled_reservations, true) {
                openReservations(ReservationListActivity.MODE_HISTORY)
            }
            weekCountView = statCard(bottom, R.string.this_week, false) {
                openReservations(ReservationListActivity.MODE_UPCOMING)
            }
        } else {
            activeCountView = statCard(top, R.string.pending_bookings, true) {
                openReservations(ReservationListActivity.MODE_STAFF)
            }
            pendingCountView = statCard(top, R.string.approved_reservations, false) {
                openReservations(ReservationListActivity.MODE_STAFF)
            }
            historyCountView = statCard(bottom, R.string.completed_reservations, true) {
                openReservations(ReservationListActivity.MODE_STAFF)
            }
            weekCountView = statCard(bottom, R.string.cancelled_reservations, false) {
                openReservations(ReservationListActivity.MODE_STAFF)
            }
        }
        parent.addView(top, matchWidth())
        parent.addView(bottom, matchWidth())
    }

    private fun renderRecent(rows: List<ReservationRecord>, stations: List<StationRecord>) {
        recentList.removeAllViews()
        if (rows.isEmpty()) {
            recentList.addView(TextView(this).apply {
                text = getString(R.string.no_reservations_yet)
                textSize = 15f
                setTextColor(getColor(R.color.solar_muted))
                setPadding(dp(4), dp(4), dp(4), dp(8))
            })
            return
        }
        rows.forEach { row -> recentList.addView(bookingCard(row, stations)) }
    }

    private fun bookingCard(row: ReservationRecord, stations: List<StationRecord>): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(12), dp(14), dp(12))
            background = rounded(Color.WHITE, 12)
            setOnClickListener { openReservation(row.reservationId, false) }
        }
        card.addView(TextView(this).apply {
            text = stationLabel(row.stationId, stations)
            textSize = 16f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(getColor(R.color.solar_heading))
        })
        card.addView(TextView(this).apply {
            text = "${utcDate(row.scheduledAtUtc)}   ${utcTime(row.scheduledAtUtc)} UTC   ·   ${row.status}"
            textSize = 13f
            setTextColor(getColor(R.color.solar_muted))
            setPadding(0, dp(4), 0, dp(8))
        })
        val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        actions.addView(cardAction(getString(R.string.view_reservation)) {
            openReservation(row.reservationId, false)
        })
        if (role == "Prosumer" && (row.status == "Approved" || row.status == "Scheduled")) {
            actions.addView(cardAction(getString(R.string.show_qr)) {
                openReservation(row.reservationId, true)
            })
        }
        card.addView(actions)
        return card.also {
            it.layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(8) }
        }
    }

    private fun cardAction(label: String, onClick: () -> Unit) = Button(this).apply {
        text = label
        isAllCaps = false
        textSize = 13f
        minHeight = dp(40)
        backgroundTintList = null
        stateListAnimator = null
        setBackgroundResource(R.drawable.solar_button)
        setTextColor(getColor(R.color.solar_accent))
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
            marginEnd = dp(8)
        }
    }

    private fun openReservation(id: String, showQr: Boolean) {
        startActivity(Intent(this, ReservationDetailActivity::class.java)
            .putExtra(ReservationDetailActivity.ID_KEY, id)
            .putExtra(ReservationDetailActivity.SHOW_QR_KEY, showQr))
    }

    private fun openReservations(mode: String) {
        startActivity(Intent(this, ReservationListActivity::class.java)
            .putExtra(ReservationListActivity.MODE_KEY, mode))
    }

    private fun statCard(parent: LinearLayout, label: Int, endGap: Boolean, onOpen: () -> Unit): TextView {
        val number = TextView(this).apply {
            text = "—"
            textSize = 26f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(getColor(R.color.solar_heading))
        }
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(14), dp(12), dp(14))
            background = rounded(Color.WHITE, 12)
            elevation = dp(1).toFloat()
            isClickable = true
            isFocusable = true
            setOnClickListener { onOpen() }
            addView(number)
            addView(TextView(this@RoleHomeActivity).apply {
                text = getString(label)
                textSize = 12f
                setTextColor(getColor(R.color.solar_muted))
                setPadding(0, dp(4), 0, 0)
            })
        }
        parent.addView(card, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
            if (endGap) marginEnd = dp(8)
        })
        return number
    }

    private fun accentButton(label: String, filled: Boolean, onClick: () -> Unit) = Button(this).apply {
        text = label
        isAllCaps = false
        textSize = 17f
        setTypeface(typeface, Typeface.BOLD)
        minHeight = dp(56)
        backgroundTintList = null
        stateListAnimator = null
        if (filled) {
            setTextColor(Color.WHITE)
            background = rounded(getColor(R.color.solar_accent), 8)
        } else {
            setTextColor(getColor(R.color.solar_accent))
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = dp(8).toFloat()
                setStroke(dp(2), getColor(R.color.solar_accent))
            }
        }
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(10) }
    }

    private fun actionRow(parent: LinearLayout, label: Int, onClick: () -> Unit) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), dp(14), dp(16), dp(14))
            background = rounded(Color.WHITE, 10)
            isClickable = true
            isFocusable = true
            setOnClickListener { onClick() }
        }
        row.addView(TextView(this).apply {
            text = getString(label)
            textSize = 16f
            setTextColor(getColor(R.color.solar_heading))
        }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(TextView(this).apply {
            text = "›"
            textSize = 22f
            setTextColor(getColor(R.color.solar_accent))
        })
        parent.addView(row, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(8) })
    }

    private fun rounded(color: Int, radiusDp: Int) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(radiusDp).toFloat()
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun sectionTitle(label: Int) = TextView(this).apply {
        text = getString(label)
        textSize = 18f
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(getColor(R.color.solar_heading))
        setPadding(0, dp(18), 0, dp(8))
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
