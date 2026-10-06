package com.smartsolar.microgrid.activities

import android.os.Bundle
import android.text.InputType
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.api.objects
import com.smartsolar.microgrid.ui.SolarActivity
import org.json.JSONObject

data class BookingChoices(val options: JSONObject, val reservation: JSONObject?, val userId: String)

class ReservationFormActivity : SolarActivity() {
    private var reservationId: String? = null
    private lateinit var people: Spinner
    private lateinit var stations: Spinner
    private lateinit var slots: Spinner
    private lateinit var service: Spinner
    private lateinit var energy: EditText
    private lateinit var submit: Button
    private var choices: BookingChoices? = null
    private var peopleRows = emptyList<JSONObject>()
    private var stationRows = emptyList<JSONObject>()
    private var slotRows = emptyList<JSONObject>()
    private var selectionChanging = false
    private var desiredStation = ""
    private var desiredSlot = ""
    private var desiredProsumer = ""
    private var desiredService = 0
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        reservationId = intent.getStringExtra("reservationId")
        if (!setup(getString(if (reservationId == null) R.string.create_reservation else R.string.modify_reservation),
                listOf("Prosumer", "Backoffice"))) return
        desiredStation = savedInstanceState?.getString("station").orEmpty()
        desiredSlot = savedInstanceState?.getString("slot").orEmpty()
        desiredProsumer = savedInstanceState?.getString("prosumer").orEmpty()
        desiredService = savedInstanceState?.getInt("service") ?: 0
        text(getString(R.string.server_options_hint))
        people = spinner(getString(R.string.prosumer))
        stations = spinner(getString(R.string.station))
        slots = spinner(getString(R.string.slot))
        service = spinner(getString(R.string.service_type)).apply {
            adapter = ArrayAdapter(this@ReservationFormActivity, android.R.layout.simple_spinner_dropdown_item, listOf("Drop-off", "Charging"))
            setSelection(desiredService)
            visibility = if (reservationId == null) View.VISIBLE else View.GONE
        }
        energy = input(getString(R.string.energy_kwh)).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            id = R.id.reservation_energy
            setText(savedInstanceState?.getString("energy").orEmpty())
            visibility = if (reservationId == null) View.VISIBLE else View.GONE
        }
        submit = button(getString(R.string.review_booking), false) { review() }
        button(getString(R.string.retry)) { loadChoices(selectedPerson()) }
        back()
        stations.onItemSelectedListener = listener {
            if (!selectionChanging) {
                val row = stationRows.getOrNull(stations.selectedItemPosition - 1)
                slotRows = row?.getJSONArray("slots")?.objects().orEmpty()
                slots.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item,
                    listOf(getString(R.string.select_slot)) + slotRows.map { "${it.getString("label")} · ${date(it.getString("start"))}" })
                if (desiredSlot.isNotBlank()) {
                    slots.setSelection((slotRows.indexOfFirst { it.getString("id") == desiredSlot } + 1).coerceAtLeast(0))
                    desiredSlot = ""
                }
            }
        }
        people.onItemSelectedListener = listener {
            if (!selectionChanging && role == "Backoffice" && reservationId == null) {
                val selected = selectedPerson()
                if (selected.isNotBlank() && selected != choices?.userId) loadChoices(selected)
            }
        }
        screen.state.observe(this) { state ->
            status(state); submit.isEnabled = !state.busy && choices != null
            val data = state.data
            if (data is BookingChoices && data !== choices) {
                choices = data; selectionChanging = true
                submit.isEnabled = !state.busy
                peopleRows = data.options.getJSONArray("prosumers").objects()
                people.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item,
                    listOf(getString(R.string.select_prosumer)) + peopleRows.map { it.getString("name") })
                people.setSelection((peopleRows.indexOfFirst { it.getString("id") == data.userId } + 1).coerceAtLeast(0))
                people.isEnabled = role == "Backoffice" && reservationId == null
                stationRows = data.options.getJSONArray("stations").objects()
                stations.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item,
                    listOf(getString(R.string.select_station)) + stationRows.map { it.getString("name") })
                val stationIndex = stationRows.indexOfFirst { it.getString("id") == desiredStation } + 1
                selectionChanging = false
                stations.setSelection(stationIndex.coerceAtLeast(0))
                if (stationRows.isEmpty()) message.text = getString(R.string.no_booking_options)
                data.reservation?.let { text("${it.getString("code")} · ${it.getDouble("energyKwh")} kWh · ${it.getString("serviceType")}") }
            } else if (data is JSONObject) {
                content.removeAllViews()
                heading(getString(R.string.reservation_saved))
                text("${data.getString("code")} · ${data.getString("status")}")
                text("${data.getString("stationName")} · ${date(data.getString("start"))}")
                text("${data.getDouble("energyKwh")} kWh")
                button(getString(R.string.reservation_details)) { open(ReservationDetailActivity::class.java, data.getString("id")); finish() }
                back()
            }
        }
        if (screen.state.value?.data == null && screen.state.value?.busy != true) loadChoices(desiredProsumer)
    }
    private fun spinner(label: String): Spinner {
        text(label)
        return Spinner(this).apply { content.addView(this, params()) }
    }
    private fun listener(action: () -> Unit) = object : AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) { action() }
        override fun onNothingSelected(parent: AdapterView<*>?) = Unit
    }
    private fun selectedPerson() = peopleRows.getOrNull(people.selectedItemPosition - 1)?.getString("id").orEmpty()
    private fun loadChoices(person: String = "") {
        screen.request {
            val identity = api.identity()
            val current = reservationId?.let { api.detail(it) }
            val target = current?.getString("prosumerId")
                ?: if (identity.getString("role") == "Prosumer") identity.getString("userId") else person
            BookingChoices(api.options(target.takeIf { it.isNotBlank() }), current, target)
        }
    }
    private fun review() {
        val slot = slotRows.getOrNull(slots.selectedItemPosition - 1)
        if (slot == null) { message.text = getString(R.string.select_slot); return }
        val amount = energy.text.toString().toDoubleOrNull()
        if (reservationId == null && (amount == null || !amount.isFinite())) { message.text = getString(R.string.enter_energy); return }
        val person = selectedPerson()
        if (person.isBlank()) { message.text = getString(R.string.select_prosumer); return }
        val serviceType = service.selectedItem.toString()
        val slotId = slot.getString("id")
        AlertDialog.Builder(this).setTitle(R.string.review_booking)
            .setMessage("${slot.getString("label")}\n${date(slot.getString("start"))}\n${amount ?: choices?.reservation?.getDouble("energyKwh")} kWh")
            .setPositiveButton(R.string.confirm) { _, _ ->
                screen.request {
                    reservationId?.let { api.modify(it, slotId) } ?: api.create(JSONObject()
                        .put("prosumerId", person).put("slotId", slotId).put("serviceType", serviceType).put("energyKwh", amount))
                }
            }.setNegativeButton(R.string.back, null).show()
    }
    override fun onSaveInstanceState(outState: Bundle) {
        if (::stations.isInitialized) {
            outState.putString("station", stationRows.getOrNull(stations.selectedItemPosition - 1)?.getString("id"))
            outState.putString("slot", slotRows.getOrNull(slots.selectedItemPosition - 1)?.getString("id"))
            outState.putString("prosumer", selectedPerson())
            outState.putString("energy", energy.text.toString())
            outState.putInt("service", service.selectedItemPosition)
        }
        super.onSaveInstanceState(outState)
    }
}
