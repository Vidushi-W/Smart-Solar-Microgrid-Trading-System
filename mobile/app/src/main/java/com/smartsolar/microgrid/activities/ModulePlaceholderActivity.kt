// Placeholder for a module that is not connected yet.
// Logout clears authentication_session and the local SQLite account.
package com.smartsolar.microgrid.activities

import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.smartsolar.microgrid.R

class ModulePlaceholderActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val title = intent.getStringExtra(TITLE_KEY) ?: getString(R.string.connected_module)
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            setBackgroundColor(getColor(R.color.solar_background))
        }
        content.addView(com.smartsolar.microgrid.ui.SolarUi.backBar(this), matchWidth())
        content.addView(TextView(this).apply {
            text = title
            textSize = 26f
            gravity = Gravity.CENTER
            setTextColor(getColor(R.color.solar_heading))
        }, matchWidth())
        content.addView(TextView(this).apply {
            text = getString(R.string.module_not_connected)
            textSize = 15f
            gravity = Gravity.CENTER
            setTextColor(getColor(R.color.solar_muted))
        }, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.back_to_dashboard)
            setOnClickListener { finish() }
        }, matchWidth())
        content.addView(Button(this).apply {
            text = getString(R.string.logout)
            setOnClickListener {
                getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE).edit().clear().apply()
                com.smartsolar.microgrid.authentication.LocalAccountStore(applicationContext).clear()
                startActivity(android.content.Intent(this@ModulePlaceholderActivity, MainActivity::class.java).addFlags(
                    android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK or android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                ))
                finish()
            }
        }, matchWidth())
        setContentView(content)
    }

    private fun matchWidth() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = 16 }

    companion object {
        const val TITLE_KEY = "module_title"
    }
}
