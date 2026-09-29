package com.smartsolar.microgrid.authentication

data class UpdateProsumerProfileRequest(
    val name: String,
    val email: String,
    val contactNumber: String,
    val address: String
)
