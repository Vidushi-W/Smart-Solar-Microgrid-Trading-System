// Body for POST /api/prosumers/register. This type is not written to local storage.
package com.smartsolar.microgrid.authentication

data class RegisterProsumerRequest(
    val nic: String,
    val fullName: String,
    val email: String,
    val phoneNumber: String,
    val address: String,
    val password: String,
    val confirmPassword: String
)
