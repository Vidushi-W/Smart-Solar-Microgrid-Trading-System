package com.smartsolar.microgrid.models

data class StationRecord(
    val stationId: String,
    val name: String,
    val status: String,
    val capacityKwh: Double
)

data class SlotRecord(
    val slotId: String,
    val stationId: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val remainingCapacity: Int,
    val status: String
)

data class ReservationRecord(
    val reservationId: String,
    val prosumerId: String,
    val stationId: String,
    val slotId: String,
    val scheduledAtUtc: String,
    val status: String,
    val createdAtUtc: String,
    val updatedAtUtc: String
)

private val stationNames = mapOf(
    "st-cmb" to "Colombo Fort Solar Hub",
    "st-neg" to "Negombo Coast Node",
    "st-7d9de2cb" to "Kandy Grid Point"
)

fun stationLabel(station: StationRecord?): String {
    val provided = station?.name?.trim().orEmpty()
    if (provided.isNotEmpty()) return provided
    val id = station?.stationId.orEmpty()
    return stationNames[id] ?: id.ifBlank { "Station" }
}

fun stationLabel(stationId: String, stations: List<StationRecord>): String =
    stationLabel(stations.find { it.stationId == stationId } ?: StationRecord(stationId, "", "", 0.0))

fun utcDate(iso: String): String = iso.take(10)

fun utcTime(iso: String): String =
    if (iso.length >= 16) iso.substring(11, 16) else ""
