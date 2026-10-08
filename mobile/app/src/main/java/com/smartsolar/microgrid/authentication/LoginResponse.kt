// Successful POST /api/auth/login. MainActivity stores the token; this type does not.
package com.smartsolar.microgrid.authentication

data class LoginResponse(
    val message: String,
    val role: UserRole,
    val token: String
)
