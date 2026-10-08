// GET /api/stations with the caller's bearer token.
package com.smartsolar.microgrid.stations

import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class StationsApiClient(private val baseUrl: String) {
    // Skips rows whose latitude or longitude is missing or out of range.
    fun list(token: String): List<Station> {
        val connection = (URL("${baseUrl.trimEnd('/')}/api/stations").openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 10_000
            readTimeout = 10_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
        }

        return try {
            val code = connection.responseCode
            val body = (if (code in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                val problem = runCatching { JSONObject(body) }.getOrDefault(JSONObject())
                val message = problem.optString("detail").ifBlank {
                    problem.optString("title").ifBlank { "Could not load stations." }
                }
                throw IOException(message)
            }

            val rows = JSONArray(body)
            buildList {
                for (index in 0 until rows.length()) {
                    val row = rows.optJSONObject(index) ?: continue
                    val latitudeValue = row.optDouble("latitude", Double.NaN)
                    val longitudeValue = row.optDouble("longitude", Double.NaN)
                    if (!latitudeValue.isFinite() || latitudeValue !in -90.0..90.0 ||
                        !longitudeValue.isFinite() || longitudeValue !in -180.0..180.0
                    ) continue

                    val schedule = row.optJSONObject("operatingSchedule") ?: JSONObject()
                    val days = schedule.optJSONArray("days")
                    add(
                        Station(
                            stationId = row.optString("stationId"),
                            name = row.optString("name", "Solar station"),
                            latitude = latitudeValue,
                            longitude = longitudeValue,
                            capacityKwh = row.optDouble("capacityKwh", 0.0),
                            totalBatterySlots = row.optInt("totalBatterySlots", 0),
                            availableBatterySlots = row.optInt("availableBatterySlots", 0),
                            scheduleDays = days?.let { array ->
                                (0 until array.length()).mapNotNull { array.optString(it).takeIf(String::isNotBlank) }
                            }.orEmpty(),
                            openTime = schedule.optString("openTime"),
                            closeTime = schedule.optString("closeTime"),
                            status = row.optString("status"),
                            distanceKilometers = row.optDouble("distanceKilometers").takeIf { it.isFinite() }
                        )
                    )
                }
            }
        } finally {
            connection.disconnect()
        }
    }
}
