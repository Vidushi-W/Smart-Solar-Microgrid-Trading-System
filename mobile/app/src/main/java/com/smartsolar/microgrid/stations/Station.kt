// One station from GET /api/stations, with coordinates, battery slots, hours, and status.
package com.smartsolar.microgrid.stations

data class Station(
    val stationId: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val capacityKwh: Double,
    val totalBatterySlots: Int,
    val availableBatterySlots: Int,
    val scheduleDays: List<String>,
    val openTime: String,
    val closeTime: String,
    val status: String,
    val distanceKilometers: Double?
)
