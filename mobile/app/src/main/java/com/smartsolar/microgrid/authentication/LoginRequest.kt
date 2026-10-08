// POST /api/auth/login body. identifier is a username or NIC.
package com.smartsolar.microgrid.authentication

data class LoginRequest(
    val identifier: String,
    val password: String
)
