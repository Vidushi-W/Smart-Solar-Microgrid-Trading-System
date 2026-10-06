package com.smartsolar.microgrid.authentication

data class MobileAccountProfile(
    val userId: String,
    val username: String,
    val nic: String,
    val name: String,
    val email: String,
    val contactNumber: String,
    val address: String,
    val role: String,
    val accountStatus: String,
    val isActive: Boolean,
    val createdAtUtc: String,
    val profilePictureData: String? = null
)
