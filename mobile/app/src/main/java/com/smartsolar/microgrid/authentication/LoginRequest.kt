package com.smartsolar.microgrid.authentication

data class LoginRequest(
    val identifier: String,
    val password: String
)
