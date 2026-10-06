package com.smartsolar.microgrid.api

import com.smartsolar.microgrid.models.ReservationRecord
import com.smartsolar.microgrid.models.SlotRecord
import com.smartsolar.microgrid.models.StationRecord
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Thin client for the account API reservation and station endpoints.
 * Booking rules stay on the server. This class only sends the request and reads the response.
 */
class ReservationApiClient(private val baseUrl: String) {
    fun stations(token: String): List<StationRecord> =
        getArray("/api/stations", token).map { item ->
            StationRecord(
                stationId = item.getString("stationId"),
                name = item.optString("name"),
                status = item.optString("status"),
                capacityKwh = item.optDouble("capacityKwh", 0.0)
            )
        }

    fun slots(token: String, stationId: String, date: String): List<SlotRecord> =
        getArray("/api/stations/${encode(stationId)}/slots?date=${encode(date)}", token).map { item ->
            SlotRecord(
                slotId = item.getString("slotId"),
                stationId = item.optString("stationId", stationId),
                date = item.optString("date").take(10),
                startTime = item.optString("startTime").take(5),
                endTime = item.optString("endTime").take(5),
                remainingCapacity = item.optInt("remainingCapacity"),
                status = item.optString("status")
            )
        }

    fun myReservations(token: String): List<ReservationRecord> =
        getArray("/api/reservations/my", token).map(::reservation)

    fun allReservations(token: String): List<ReservationRecord> =
        getArray("/api/reservations", token).map(::reservation)

    fun reservation(token: String, id: String): ReservationRecord =
        reservation(getObject("/api/reservations/${encode(id)}", token))

    fun create(token: String, prosumerId: String, stationId: String, slotId: String, scheduledAtUtc: String): ReservationRecord {
        val body = JSONObject()
            .put("prosumerId", prosumerId)
            .put("stationId", stationId)
            .put("slotId", slotId)
            .put("scheduledAtUtc", scheduledAtUtc)
        return reservation(send("POST", "/api/reservations", token, body))
    }

    fun update(
        token: String,
        id: String,
        prosumerId: String,
        stationId: String,
        slotId: String,
        scheduledAtUtc: String,
        status: String
    ): ReservationRecord {
        val body = JSONObject()
            .put("prosumerId", prosumerId)
            .put("stationId", stationId)
            .put("slotId", slotId)
            .put("scheduledAtUtc", scheduledAtUtc)
            .put("status", status)
        return reservation(send("PUT", "/api/reservations/${encode(id)}", token, body))
    }

    fun cancel(token: String, id: String): ReservationRecord =
        reservation(send("DELETE", "/api/reservations/${encode(id)}", token, null))

    fun issueQr(token: String, id: String): String {
        val item = send("POST", "/api/reservations/${encode(id)}/qr", token, JSONObject())
        val payload = item.optJSONObject("qrPayload") ?: item.optJSONObject("QrPayload")
            ?: throw IOException("The transfer QR response did not include a code.")
        return payload.toString()
    }

    private fun reservation(item: JSONObject) = ReservationRecord(
        reservationId = item.getString("reservationId"),
        prosumerId = item.optString("prosumerId"),
        stationId = item.optString("stationId"),
        slotId = item.optString("slotId"),
        scheduledAtUtc = item.optString("scheduledAtUtc"),
        status = item.optString("status"),
        createdAtUtc = item.optString("createdAtUtc"),
        updatedAtUtc = item.optString("updatedAtUtc")
    )

    private fun getArray(path: String, token: String): List<JSONObject> {
        val (code, text) = request("GET", path, token, null)
        if (code !in 200..299) throw IOException(messageOf(text, code))
        val array = JSONArray(text.ifBlank { "[]" })
        return List(array.length()) { index -> array.getJSONObject(index) }
    }

    private fun getObject(path: String, token: String): JSONObject {
        val (code, text) = request("GET", path, token, null)
        if (code !in 200..299) throw IOException(messageOf(text, code))
        return JSONObject(text.ifBlank { "{}" })
    }

    private fun send(method: String, path: String, token: String, body: JSONObject?): JSONObject {
        val (code, text) = request(method, path, token, body)
        if (code !in 200..299) throw IOException(messageOf(text, code))
        return JSONObject(text.ifBlank { "{}" })
    }

    private fun request(method: String, path: String, token: String, body: JSONObject?): Pair<Int, String> {
        val connection = (URL("${baseUrl.trimEnd('/')}$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 15_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }
        return try {
            if (body != null) {
                connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            connection.responseCode to text
        } finally {
            connection.disconnect()
        }
    }

    private fun messageOf(body: String, code: Int): String {
        val json = runCatching { JSONObject(body) }.getOrNull() ?: return "HTTP $code"
        val message = json.optString("message")
        if (message.isNotBlank()) return message
        val detail = json.optString("detail")
        if (detail.isNotBlank()) return detail
        val title = json.optString("title")
        if (title.isNotBlank()) return title
        return "HTTP $code"
    }

    private fun encode(value: String) = java.net.URLEncoder.encode(value, Charsets.UTF_8.name())
}
