package com.smartsolar.microgrid.ui

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import com.smartsolar.microgrid.R

object SolarUi {
    fun backBar(activity: Activity): TextView = TextView(activity).apply {
        text = "‹  ${activity.getString(R.string.back)}"
        textSize = 16f
        setTypeface(typeface, Typeface.BOLD)
        setTextColor(activity.getColor(R.color.solar_accent))
        setPadding(0, 0, 0, dp(activity, 14))
        isClickable = true
        isFocusable = true
        contentDescription = activity.getString(R.string.back)
        setOnClickListener { activity.finish() }
    }

    fun primary(button: Button) {
        button.isAllCaps = false
        button.setTextColor(Color.WHITE)
        button.backgroundTintList = null
        button.stateListAnimator = null
        button.setBackgroundResource(R.drawable.solar_button_primary)
        button.setTypeface(button.typeface, Typeface.BOLD)
        button.minHeight = dp(button, 52)
    }

    fun field(field: EditText) {
        val pad = dp(field, 14)
        field.backgroundTintList = null
        field.setBackgroundResource(R.drawable.solar_field)
        field.setPadding(pad, pad, pad, pad)
        field.setTextColor(field.context.getColor(R.color.solar_heading))
        field.setHintTextColor(field.context.getColor(R.color.solar_muted))
    }

    fun primaryButton(context: android.content.Context, label: String, onClick: () -> Unit) = Button(context).apply {
        text = label
        setOnClickListener { onClick() }
        primary(this)
    }

    fun outlineButton(context: android.content.Context, label: String, onClick: () -> Unit) = Button(context).apply {
        text = label
        isAllCaps = false
        textSize = 15f
        setTypeface(typeface, Typeface.BOLD)
        minHeight = dp(this, 48)
        setTextColor(context.getColor(R.color.solar_accent))
        backgroundTintList = null
        stateListAnimator = null
        setBackgroundResource(R.drawable.solar_button)
        setOnClickListener { onClick() }
    }

    fun facts(context: android.content.Context, rows: List<Pair<String, String>>): LinearLayout {
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(Color.WHITE, dp(context, 12))
            setPadding(dp(context, 16), dp(context, 8), dp(context, 16), dp(context, 8))
        }
        rows.forEachIndexed { index, (label, value) ->
            card.addView(TextView(context).apply {
                text = label
                textSize = 12f
                setTextColor(context.getColor(R.color.solar_muted))
                setPadding(0, dp(context, 10), 0, 0)
            })
            card.addView(TextView(context).apply {
                text = value.ifBlank { "—" }
                textSize = 16f
                setTypeface(typeface, Typeface.BOLD)
                setTextColor(context.getColor(R.color.solar_heading))
                setPadding(0, dp(context, 2), 0, dp(context, 10))
            })
            if (index < rows.lastIndex) {
                card.addView(View(context).apply {
                    setBackgroundColor(context.getColor(R.color.solar_line))
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        dp(context, 1)
                    )
                })
            }
        }
        return card
    }

    fun statusChip(context: android.content.Context, status: String) = TextView(context).apply {
        text = status.ifBlank { "—" }
        textSize = 13f
        setTypeface(typeface, Typeface.BOLD)
        val (background, ink) = when (status) {
            "Approved", "Completed", "Scheduled" -> Color.parseColor("#E0EFEA") to Color.parseColor("#1B6F62")
            "Pending", "Requested" -> Color.parseColor("#FFF0D6") to Color.parseColor("#8B5B18")
            "Cancelled", "Rejected" -> Color.parseColor("#FBE8DF") to Color.parseColor("#B43D2D")
            else -> Color.parseColor("#ECECEA") to Color.parseColor("#5C6264")
        }
        setTextColor(ink)
        setPadding(dp(context, 12), dp(context, 6), dp(context, 12), dp(context, 6))
        this.background = rounded(background, dp(context, 20))
    }

    fun choiceCard(context: android.content.Context, title: String, detail: String, onClick: () -> Unit) =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(Color.WHITE, dp(context, 12))
            setPadding(dp(context, 16), dp(context, 14), dp(context, 16), dp(context, 14))
            isClickable = true
            isFocusable = true
            setOnClickListener { onClick() }
            addView(TextView(context).apply {
                text = title
                textSize = 16f
                setTypeface(typeface, Typeface.BOLD)
                setTextColor(context.getColor(R.color.solar_heading))
            })
            if (detail.isNotBlank()) {
                addView(TextView(context).apply {
                    text = detail
                    textSize = 13f
                    setTextColor(context.getColor(R.color.solar_muted))
                    setPadding(0, dp(context, 4), 0, 0)
                })
            }
        }

    fun popup(
        activity: Activity,
        title: String,
        message: CharSequence? = null,
        content: View? = null,
        confirm: String,
        dismiss: String? = null,
        onConfirm: (() -> Unit)? = null
    ) {
        val root = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(activity, 22), dp(activity, 22), dp(activity, 22), dp(activity, 16))
        }
        root.addView(TextView(activity).apply {
            text = "SOLARGRID"
            textSize = 11f
            letterSpacing = 0.14f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(activity.getColor(R.color.solar_accent))
        })
        root.addView(TextView(activity).apply {
            text = title
            textSize = 22f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(activity.getColor(R.color.solar_heading))
            setPadding(0, dp(activity, 6), 0, dp(activity, 10))
        })
        if (!message.isNullOrBlank()) {
            root.addView(TextView(activity).apply {
                this.text = message
                textSize = 15f
                setTextColor(activity.getColor(R.color.solar_muted))
                setLineSpacing(dp(activity, 2).toFloat(), 1f)
                setPadding(0, 0, 0, dp(activity, 12))
            })
        }
        content?.let { view ->
            root.addView(view, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(activity, 12) })
        }
        val dialog = AlertDialog.Builder(activity).setView(root).create()
        val actions = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        if (dismiss != null) {
            actions.addView(outlineButton(activity, dismiss) { dialog.dismiss() }, weighted(activity, true))
        }
        actions.addView(primaryButton(activity, confirm) {
            onConfirm?.invoke()
            dialog.dismiss()
        }, weighted(activity, false))
        root.addView(actions, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { topMargin = dp(activity, 6) })
        dialog.setOnShowListener {
            dialog.window?.setBackgroundDrawable(rounded(Color.WHITE, dp(activity, 18)))
        }
        dialog.show()
    }

    private fun weighted(context: android.content.Context, gap: Boolean) = LinearLayout.LayoutParams(
        0,
        LinearLayout.LayoutParams.WRAP_CONTENT,
        1f
    ).apply { if (gap) marginEnd = dp(context, 8) }

    private fun rounded(color: Int, radiusPx: Int) = GradientDrawable().apply {
        setColor(color)
        cornerRadius = radiusPx.toFloat()
    }

    private fun dp(view: View, value: Int) = dp(view.context, value)

    private fun dp(context: android.content.Context, value: Int) =
        (value * context.resources.displayMetrics.density).toInt()
}
