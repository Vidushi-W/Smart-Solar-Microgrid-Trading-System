// Response from POST /api/prosumers/register: message, NIC, and account status.
package com.smartsolar.microgrid.authentication

data class ProsumerRegistrationResponse(
    val message: String,
    val nic: String,
    val accountStatus: String
)
