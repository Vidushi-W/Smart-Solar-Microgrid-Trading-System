package com.smartsolar.microgrid.authentication

data class AuthenticatedUser(
    val userId: String,
    val username: String,
    val role: UserRole
)
