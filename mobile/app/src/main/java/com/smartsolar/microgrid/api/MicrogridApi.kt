// Authenticated client for reservation lists and QR transfers.
// Reservation calls use RESERVATION_API_BASE_URL. QR issue, verify, and complete use API_BASE_URL.
// The JWT comes from authentication_session. Debug builds also send X-User-Id and X-User-Role.
package com.smartsolar.microgrid.api

import android.content.Context
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.activities.MainActivity
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class ApiFailure(val status: Int, message: String) : IOException(message)

data class QrPayload(val version: Int, val reservationId: String, val token: String) {
    fun json() = JSONObject().put("version", version).put("reservationId", reservationId).put("token", token)
    companion object {
        // Decode only. Validity, eligibility and credential checks belong to C#.
        fun parse(text: String): QrPayload {
            require(text.length <= 4096) { "QR payload is too large." }
            val json = JSONObject(text)
            val version = json.get("version")
            require(version is Int) { "QR version must be an integer." }
            require(json.get("reservationId") is String && json.get("token") is String) { "Malformed QR payload." }
            return QrPayload(version, json.getString("reservationId"), json.getString("token"))
        }
    }
}

data class QrTransfer(
    val transactionId: String, val reservationId: String, val prosumerId: String,
    val stationId: String, val slotId: String, val energyKwh: Double,
    val reservationStatus: String, val tokenStatus: String,
    val verificationToken: String?, val completedAtUtc: String?, val completedBy: String?
) {
    companion object {
        fun from(json: JSONObject) = QrTransfer(
            json.getString("transactionId"), json.getString("reservationId"), json.getString("prosumerId"),
            json.getString("stationId"), json.getString("slotId"), json.getDouble("energyKwh"),
            json.getString("reservationStatus"), json.getString("tokenStatus"),
            json.nullableString("verificationToken"), json.nullableString("completedAtUtc"), json.nullableString("completedBy")
        )
    }
}
private fun JSONObject.nullableString(key: String) = if (isNull(key)) null else getString(key)
fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }
fun JSONArray.strings(): List<String> = (0 until length()).map { getString(it) }

class MicrogridApi(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(MainActivity.SESSION_PREFS, Context.MODE_PRIVATE)
    private val token get() = preferences.getString(MainActivity.TOKEN_KEY, null)
        ?: throw ApiFailure(401, "Sign in is required.")
    fun identity(): JSONObject = request(BuildConfig.API_BASE_URL, "/api/auth/me") as JSONObject

    // Bearer JSON call. A dead connection becomes status 0 because the outcome may be unknown.
    private fun request(base: String, path: String, method: String = "GET", body: JSONObject? = null,
                        identity: JSONObject? = null): Any {
        val jwt = token
        val connection = (URL(base.trimEnd('/') + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 10_000
            readTimeout = 15_000
            setRequestProperty("Authorization", "Bearer $jwt")
            setRequestProperty("Accept", "application/json")
            // Matches the existing Development host; never enabled in a release client.
            if (identity != null && BuildConfig.DEBUG) {
                setRequestProperty("X-User-Id", identity.getString("userId"))
                setRequestProperty("X-User-Role", identity.getString("role"))
            }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }
        try {
            body?.let { data -> connection.outputStream.use { it.write(data.toString().toByteArray(Charsets.UTF_8)) } }
            val status = connection.responseCode
            val raw = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            val data = try { JSONTokener(raw).nextValue() } catch (_: Exception) { null }
            if (status !in 200..299) {
                val error = data as? JSONObject
                val validation = error?.optJSONObject("errors")?.let { errors ->
                    errors.keys().asSequence().flatMap { key ->
                        (errors.optJSONArray(key)?.let { list -> (0 until list.length()).map { list.getString(it) } } ?: emptyList()).asSequence()
                    }.joinToString(" ")
                }.orEmpty()
                val message = listOf(error?.optString("message"), error?.optString("detail"), validation, error?.optString("title"))
                    .firstOrNull { !it.isNullOrBlank() } ?: "Request failed ($status)."
                throw ApiFailure(status, message)
            }
            return data ?: throw ApiFailure(status, "The server returned an unreadable response.")
        } catch (error: ApiFailure) {
            throw error
        } catch (error: IOException) {
            throw ApiFailure(0, "Could not reach the API. Check your connection. The request outcome may be unknown.")
        } finally {
            connection.disconnect()
        }
    }
    // Reservation host. Debug builds attach the user from GET /api/auth/me.
    private fun reservation(path: String, method: String = "GET", body: JSONObject? = null): Any =
        request(BuildConfig.RESERVATION_API_BASE_URL, "/api$path", method, body, identity())
    fun reservations(status: String = "", query: String = "", date: String = "", stationId: String = ""): JSONArray {
        val filters = listOf("status" to status, "q" to query, "date" to date, "stationId" to stationId)
            .filter { it.second.isNotBlank() }.joinToString("&") { (key, value) -> "$key=${encode(value)}" }
        return reservation("/reservations" + if (filters.isEmpty()) "" else "?$filters") as JSONArray
    }
    fun detail(id: String) = reservation("/reservations/${encode(id)}") as JSONObject
    fun dashboard() = reservation("/dashboard/reservations") as JSONObject
    fun options(prosumerId: String? = null) = reservation("/reservations/options" +
        (prosumerId?.let { "?prosumerId=${encode(it)}" } ?: "")) as JSONObject
    fun create(body: JSONObject) = reservation("/reservations", "POST", body) as JSONObject
    fun modify(id: String, slotId: String) = reservation("/reservations/${encode(id)}", "PATCH", JSONObject().put("slotId", slotId)) as JSONObject
    fun action(id: String, action: String, body: JSONObject = JSONObject()) =
        reservation("/reservations/${encode(id)}/$action", "POST", body) as JSONObject
    fun issue(id: String): QrPayload {
        val response = request(BuildConfig.API_BASE_URL, "/api/reservations/${encode(id)}/qr", "POST") as JSONObject
        return QrPayload.parse(response.getJSONObject("qrPayload").toString())
    }
    fun verify(payload: QrPayload) = QrTransfer.from(request(BuildConfig.API_BASE_URL, "/api/transactions/verify", "POST", payload.json()) as JSONObject)
    fun complete(id: String, token: String, receipt: String) = QrTransfer.from(request(BuildConfig.API_BASE_URL,
        "/api/transactions/${encode(id)}/complete", "POST",
        JSONObject().put("token", token).put("verificationToken", receipt)) as JSONObject)
    companion object {
        // URL-encodes and turns spaces into %20.
        fun encode(value: String): String = java.net.URLEncoder.encode(value, "UTF-8").replace("+", "%20")
    }
}
