// Verify and complete a scanned transfer QR on the account API.
// complete posts the QR token and verification token to /api/transactions/{reservationId}/complete.
package com.smartsolar.microgrid.api

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class QrApiClient(private val baseUrl: String) {
    fun verify(token: String, reservationId: String, qrToken: String): QrCheck {
        val body = JSONObject()
            .put("version", 1)
            .put("reservationId", reservationId)
            .put("token", qrToken)
        return parse(send("POST", "/api/transactions/verify", token, body))
    }

    fun complete(token: String, reservationId: String, qrToken: String, verificationToken: String): QrCheck {
        val body = JSONObject()
            .put("token", qrToken)
            .put("verificationToken", verificationToken)
        return parse(send("POST", "/api/transactions/${encode(reservationId)}/complete", token, body))
    }

    private fun parse(item: JSONObject) = QrCheck(
        reservationId = item.optString("reservationId"),
        stationId = item.optString("stationId"),
        reservationStatus = item.optString("reservationStatus"),
        tokenStatus = item.optString("tokenStatus"),
        verificationToken = item.optString("verificationToken")
    )

    private fun send(method: String, path: String, token: String, body: JSONObject): JSONObject {
        val connection = (URL("${baseUrl.trimEnd('/')}$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 15_000
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
        }
        return try {
            connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (connection.responseCode !in 200..299) throw IOException(messageOf(text, connection.responseCode))
            JSONObject(text.ifBlank { "{}" })
        } finally {
            connection.disconnect()
        }
    }

    // Uses message, then detail, then title from an error body.
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

data class QrCheck(
    val reservationId: String,
    val stationId: String,
    val reservationStatus: String,
    val tokenStatus: String,
    val verificationToken: String
)
