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

    fun getCurrentUser(token: String): AuthenticatedUser {
        val connection = (URL("${baseUrl.trimEnd('/')}/api/auth/me").openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
        }

        return try {
            val responseText = (if (connection.responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            })?.bufferedReader()?.use { it.readText() }.orEmpty()
            val response = JSONObject(responseText.ifBlank { "{}" })
            if (connection.responseCode !in 200..299) {
                throw IOException("HTTP ${connection.responseCode}: ${response.optString("message", "Authentication expired.")}")
            }
            AuthenticatedUser(
                userId = response.getString("userId"),
                username = response.getString("username"),
                role = parseRole(response.getString("role")),
                name = response.optString("name", response.getString("username")),
                email = response.optString("email"),
                contactNumber = response.optString("contactNumber"),
                address = response.optString("address"),
                nic = response.optString("nic"),
                accountStatus = response.optString("accountStatus", "Active"),
                createdAtUtc = response.optString("createdAtUtc")
            )
        } finally {
            connection.disconnect()
        }
    }

    fun register(request: RegisterProsumerRequest): ProsumerRegistrationResponse {
        val connection = (URL("${baseUrl.trimEnd('/')}/api/prosumers/register").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 10_000
            readTimeout = 10_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }

        return try {
            val payload = JSONObject()
                .put("nic", request.nic)
                .put("fullName", request.fullName)
                .put("email", request.email)
                .put("phoneNumber", request.phoneNumber)
                .put("address", request.address)
                .put("password", request.password)
                .put("confirmPassword", request.confirmPassword)
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
                throw IOException(response.optString("message", "Registration failed."))
            }
            ProsumerRegistrationResponse(
                message = response.getString("message"),
                nic = response.getString("nic"),
                accountStatus = response.getString("accountStatus")
            )
        } finally {
            connection.disconnect()
        }
    }

    fun getMyProfile(token: String): ProsumerProfile {
        val response = authorizedRequest("/api/prosumers/me/profile", token, "GET")
        return ProsumerProfile(
            userId = response.getString("userId"),
            nic = response.getString("nic"),
            name = response.getString("name"),
            email = response.getString("email"),
            contactNumber = response.getString("contactNumber"),
            address = response.getString("address"),
            accountStatus = response.getString("accountStatus"),
            createdAtUtc = response.optString("createdAtUtc"),
            profilePictureData = response.optString("profilePictureData").takeIf(String::isNotBlank)
        )
    }

    fun updateMyProfile(token: String, request: UpdateProsumerProfileRequest): ProsumerProfile {
        val response = authorizedRequest(
            "/api/prosumers/me/profile",
            token,
            "PUT",
            JSONObject()
                .put("name", request.name)
                .put("email", request.email)
                .put("contactNumber", request.contactNumber)
                .put("address", request.address)
                .put("profilePictureData", request.profilePictureData)
        )
        return ProsumerProfile(
            userId = response.getString("userId"),
            nic = response.getString("nic"),
            name = response.getString("name"),
            email = response.getString("email"),
            contactNumber = response.getString("contactNumber"),
            address = response.getString("address"),
            accountStatus = response.getString("accountStatus"),
            createdAtUtc = response.optString("createdAtUtc"),
            profilePictureData = response.optString("profilePictureData").takeIf(String::isNotBlank)
        )
    }

    fun getMyStaffProfile(token: String): MobileAccountProfile =
        parseAccountProfile(authorizedRequest("/api/users/me/profile", token, "GET"))

    fun updateMyStaffProfile(
        token: String,
        role: UserRole,
        name: String,
        email: String,
        contactNumber: String,
        password: String?,
        profilePictureData: String? = null
    ): MobileAccountProfile {
        val roleName = when (role) {
            UserRole.BACKOFFICE -> "Backoffice"
            UserRole.GRID_OPERATOR -> "GridOperator"
            UserRole.PROSUMER -> throw IOException("Prosumer profiles use the Prosumer profile endpoint.")
        }
        val payload = JSONObject()
            .put("name", name)
            .put("email", email)
            .put("contactNumber", contactNumber)
            .put("role", roleName)
            .put("password", password)
            .put("profilePictureData", profilePictureData)
        return parseAccountProfile(authorizedRequest("/api/users/me/profile", token, "PUT", payload))
    }

    fun getMyProsumerAccount(token: String): MobileAccountProfile =
        parseAccountProfile(authorizedRequest("/api/prosumers/me/profile", token, "GET"))

    private fun parseAccountProfile(response: JSONObject) = MobileAccountProfile(
        userId = response.optString("userId", response.optString("id")),
        username = response.optString("username", response.optString("nic")),
        nic = response.optString("nic"),
        name = response.optString("name"),
        email = response.optString("email"),
        contactNumber = response.optString("contactNumber"),
        address = response.optString("address"),
        role = response.optString("role", "Prosumer"),
        accountStatus = response.optString("accountStatus", if (response.optBoolean("isActive")) "Active" else "Inactive"),
        isActive = response.optBoolean("isActive"),
        createdAtUtc = response.optString("createdAtUtc"),
        profilePictureData = response.optString("profilePictureData").takeIf(String::isNotBlank)
    )

    fun requestDeactivation(token: String): String {
        return authorizedRequest("/api/prosumers/me/deactivation", token, "POST")
            .optString("accountStatus", "DeactivationRequested")
    }

    private fun authorizedRequest(
        path: String,
        token: String,
        method: String,
        payload: JSONObject? = null
    ): JSONObject {
        val connection = (URL("${baseUrl.trimEnd('/')}$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            if (payload != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }
        return try {
            if (payload != null) {
                connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            }
            val responseText = (if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            val response = JSONObject(responseText.ifBlank { "{}" })
            if (connection.responseCode !in 200..299) {
                throw IOException("HTTP ${connection.responseCode}: ${response.optString("message", "Profile request failed.")}")
            }
            response
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
