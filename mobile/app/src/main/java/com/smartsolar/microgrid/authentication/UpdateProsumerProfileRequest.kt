// Body for PUT /api/prosumers/me/profile, including an optional JPEG data URL.
package com.smartsolar.microgrid.authentication

data class UpdateProsumerProfileRequest(
    val name: String,
    val email: String,
    val contactNumber: String,
    val address: String,
    val profilePictureData: String? = null
)
