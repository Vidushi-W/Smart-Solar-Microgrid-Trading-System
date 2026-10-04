package com.smartsolar.microgrid.authentication

data class LoginResponse(
    val message: String,
    val role: UserRole,
    val token: String
)
