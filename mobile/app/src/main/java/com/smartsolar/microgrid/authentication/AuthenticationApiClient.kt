package com.smartsolar.microgrid.authentication

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class AuthenticationApiClient(
    private val baseUrl: String
) {
    fun login(request: LoginRequest): LoginResponse {
        val connection = (URL("${baseUrl.trimEnd('/')}/api/auth/login").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 10_000
            readTimeout = 10_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }

        return try {
            val payload = JSONObject()
                .put("identifier", request.identifier)
                .put("password", request.password)
            connection.outputStream.use { output ->
                output.write(payload.toString().toByteArray(Charsets.UTF_8))
            }

            val responseText = (if (connection.responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            })?.bufferedReader()?.use { it.readText() }.orEmpty()
            val response = JSONObject(responseText.ifBlank { "{}" })

            if (connection.responseCode !in 200..299) {
                throw IOException(response.optString("message", "Login failed."))
            }

            LoginResponse(
                message = response.getString("message"),
                role = parseRole(response.getString("role")),
                token = response.getString("token")
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun parseRole(value: String): UserRole = when (value) {
        "Prosumer" -> UserRole.PROSUMER
        "GridOperator" -> UserRole.GRID_OPERATOR
        "Backoffice" -> UserRole.BACKOFFICE
        else -> throw IOException("Unsupported user role.")
    }
}
