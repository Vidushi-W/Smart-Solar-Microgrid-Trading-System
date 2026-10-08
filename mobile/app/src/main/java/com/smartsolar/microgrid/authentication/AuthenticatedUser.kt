// Identity returned by GET /api/auth/me and copied into the local account store.
package com.smartsolar.microgrid.authentication

data class AuthenticatedUser(
    val userId: String,
    val username: String,
    val role: UserRole,
    val name: String = username,
    val email: String = "",
    val contactNumber: String = "",
    val address: String = "",
    val nic: String = "",
    val accountStatus: String = "Active",
    val createdAtUtc: String = ""
)
