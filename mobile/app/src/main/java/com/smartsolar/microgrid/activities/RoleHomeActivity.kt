package com.smartsolar.microgrid.activities

import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R

class RoleHomeActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val role = intent.getStringExtra(MainActivity.ROLE_KEY) ?: return
        val title = when (role) {
            "Prosumer" -> getString(R.string.prosumer_home)
            "GridOperator" -> getString(R.string.operator_home)
            "Backoffice" -> getString(R.string.backoffice_home)
            else -> getString(R.string.access_unavailable)
        }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        content.addView(TextView(this).apply {
            text = title
            textSize = 28f
            gravity = Gravity.CENTER
            setTextColor(Color.rgb(20, 35, 29))
        })
        content.addView(TextView(this).apply {
            text = getString(R.string.login_successful, role)
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 20, 0, 20)
            setTextColor(Color.rgb(96, 112, 100))
        })
        if (role == "Prosumer") {
            content.addView(Button(this).apply {
                text = getString(R.string.my_profile)
                setOnClickListener {
                    startActivity(android.content.Intent(this@RoleHomeActivity, ProsumerProfileActivity::class.java))
                }
            })
        }
        content.addView(Button(this).apply {
            text = getString(R.string.logout)
            setOnClickListener {
                getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE).edit().clear().apply()
                startActivity(android.content.Intent(this@RoleHomeActivity, MainActivity::class.java))
                finish()
            }
        })
        setContentView(content)
    }
}
