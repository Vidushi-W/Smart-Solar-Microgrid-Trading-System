// Prosumer profile from GET /api/prosumers/me/profile, including an optional JPEG data URL.
package com.smartsolar.microgrid.authentication

data class ProsumerProfile(
    val userId: String,
    val nic: String,
    val name: String,
    val email: String,
    val contactNumber: String,
    val address: String,
    val accountStatus: String,
    val createdAtUtc: String = "",
    val profilePictureData: String? = null
)
