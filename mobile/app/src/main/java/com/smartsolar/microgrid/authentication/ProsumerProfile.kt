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
