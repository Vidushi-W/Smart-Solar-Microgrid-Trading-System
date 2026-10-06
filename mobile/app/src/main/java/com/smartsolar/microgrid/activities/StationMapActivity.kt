package com.smartsolar.microgrid.activities

import android.content.ActivityNotFoundException
import android.Manifest
import android.content.pm.PackageManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.maps.model.MarkerOptions
import com.smartsolar.microgrid.BuildConfig
import com.smartsolar.microgrid.R
import com.smartsolar.microgrid.stations.Station
import com.smartsolar.microgrid.stations.StationsApiClient
import java.util.concurrent.Executors

class StationMapActivity : AppCompatActivity(), OnMapReadyCallback {
    private val locationRequestCode = 410
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var messageView: TextView
    private lateinit var mapContainer: FrameLayout
    private lateinit var mapHint: TextView
    private lateinit var demoMapView: DemoMapView
    private lateinit var stationList: LinearLayout
    private lateinit var refreshButton: Button
    private var googleMap: GoogleMap? = null
    private var stations: List<Station> = emptyList()
    private var mapContainerId: Int = View.NO_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        mapContainerId = savedInstanceState?.getInt(MAP_CONTAINER_ID_KEY) ?: View.generateViewId()
        setContentView(createView())
        if (BuildConfig.MAPS_API_KEY_CONFIGURED) {
            val fragment = supportFragmentManager.findFragmentByTag(MAP_FRAGMENT_TAG) as? SupportMapFragment
                ?: SupportMapFragment.newInstance()
            if (!fragment.isAdded) {
                supportFragmentManager.beginTransaction().replace(mapContainerId, fragment, MAP_FRAGMENT_TAG).commit()
            }
            fragment.getMapAsync(this)
        } else {
            demoMapView.visibility = View.VISIBLE
            mapHint.visibility = View.VISIBLE
            mapHint.text = getString(R.string.demo_map_preview)
        }
        loadStations()
        requestLocationAccess()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putInt(MAP_CONTAINER_ID_KEY, mapContainerId)
        super.onSaveInstanceState(outState)
    }

    private fun createView(): View {
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(246, 248, 242))
        }
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 20, 24, 8)
        }
        header.addView(TextView(this).apply {
            text = getString(R.string.nearby_stations)
            textSize = 25f
            setTextColor(Color.rgb(26, 55, 44))
        })
        header.addView(TextView(this).apply {
            text = getString(R.string.stations_map_subtitle)
            textSize = 14f
            setTextColor(Color.rgb(91, 108, 99))
            setPadding(0, 6, 0, 6)
        })
        content.addView(header)

        messageView = TextView(this).apply {
            textSize = 14f
            setTextColor(Color.rgb(57, 76, 64))
            setPadding(24, 8, 24, 12)
        }
        content.addView(messageView)

        mapContainer = FrameLayout(this).apply {
            id = mapContainerId
            setBackgroundColor(Color.rgb(226, 232, 226))
        }
        demoMapView = DemoMapView().apply { visibility = View.GONE }
        mapContainer.addView(demoMapView, FrameLayout.LayoutParams(-1, -1))
        mapHint = TextView(this).apply {
            gravity = Gravity.CENTER
            textAlignment = View.TEXT_ALIGNMENT_CENTER
            setTextColor(Color.rgb(57, 76, 64))
            textSize = 13f
            setPadding(16, 8, 16, 8)
            setBackgroundColor(Color.argb(210, 255, 255, 255))
            visibility = View.GONE
        }
        mapContainer.addView(mapHint, FrameLayout.LayoutParams(-1, -2, Gravity.TOP))
        content.addView(mapContainer, LinearLayout.LayoutParams(-1, 0, 1f))

        stationList = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 0, 16, 4)
        }
        val stationScroll = ScrollView(this).apply {
            isFillViewport = false
            addView(stationList)
        }
        content.addView(stationScroll, LinearLayout.LayoutParams(-1, dp(180)))

        refreshButton = Button(this).apply {
            text = getString(R.string.refresh_stations)
            setOnClickListener { loadStations() }
        }
        content.addView(refreshButton, LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(20, 10, 20, 16)
        })
        return content
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        map.uiSettings.isZoomControlsEnabled = true
        enableDeviceLocation(map)
        map.setOnInfoWindowClickListener { marker ->
            val station = stations.firstOrNull { it.stationId == marker.tag as? String }
            if (station != null) openInMaps(station)
        }
        displayStationsOnMap()
    }

    private fun loadStations() {
        val token = getSharedPreferences(MainActivity.SESSION_PREFS, MODE_PRIVATE)
            .getString(MainActivity.TOKEN_KEY, null)
        if (token.isNullOrBlank()) {
            showStations(demoStations())
            return
        }
        if (token == "local-demo-token") {
            showStations(demoStations())
            return
        }

        refreshButton.isEnabled = false
        refreshButton.text = getString(R.string.loading_stations)
        messageView.text = getString(R.string.loading_stations)
        executor.execute {
            try {
                val activeStations = StationsApiClient(BuildConfig.API_BASE_URL).list(token)
                    .filter { it.status.equals("Active", ignoreCase = true) }
                runOnUiThread { showStations(activeStations) }
            } catch (error: Exception) {
                runOnUiThread {
                    showStations(demoStations())
                    messageView.text = "Showing nearby demo stations while the network is unavailable."
                }
            }
        }
    }

    private fun requestLocationAccess() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        ) return
        if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_FINE_LOCATION)) {
            messageView.text = getString(R.string.location_permission_message)
        }
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
            locationRequestCode
        )
    }

    private fun enableDeviceLocation(map: GoogleMap) {
        val fineGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (fineGranted || coarseGranted) {
            map.isMyLocationEnabled = true
            map.uiSettings.isMyLocationButtonEnabled = true
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == locationRequestCode) {
            googleMap?.let(::enableDeviceLocation)
            if (grantResults.none { it == PackageManager.PERMISSION_GRANTED }) {
                messageView.text = getString(R.string.location_permission_denied)
            }
        }
    }

    private fun demoStations(): List<Station> = listOf(
        Station("CMB-01", "Colombo Fort Microgrid", 6.9344, 79.8428, 120.0, 18, 11, listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"), "06:00", "18:00", "Active", 1.8),
        Station("KDY-01", "Kandy Lake Station", 7.2906, 80.6337, 80.0, 12, 7, listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"), "06:30", "17:30", "Active", 3.6),
        Station("GAL-01", "Galle Fort Station", 6.0260, 80.2170, 60.0, 8, 5, listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday"), "07:00", "17:00", "Active", 5.2)
    )

    private fun showStations(rows: List<Station>) {
        stations = rows
        if (stations.isEmpty()) {
            messageView.text = getString(R.string.no_active_stations)
        } else {
            messageView.text = resources.getQuantityString(
                R.plurals.active_station_count,
                stations.size,
                stations.size
            )
        }
        renderStationList()
        refreshButton.isEnabled = true
        refreshButton.text = getString(R.string.refresh_stations)
        demoMapView.invalidate()
        displayStationsOnMap()
    }

    private fun renderStationList() {
        stationList.removeAllViews()
        stations.forEach { station ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(12, 8, 8, 8)
                setBackgroundColor(Color.WHITE)
            }
            val details = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            details.addView(TextView(this).apply {
                text = station.name
                textSize = 16f
                setTextColor(Color.rgb(26, 55, 44))
            })
            details.addView(TextView(this).apply {
                text = getString(
                    R.string.station_list_summary,
                    station.latitude,
                    station.longitude,
                    station.availableBatterySlots,
                    station.totalBatterySlots
                )
                textSize = 12f
                setTextColor(Color.rgb(91, 108, 99))
            })
            row.addView(details, LinearLayout.LayoutParams(0, -2, 1f))
            row.addView(Button(this).apply {
                text = getString(R.string.open_station_in_maps)
                setOnClickListener { openInMaps(station) }
            })
            stationList.addView(row, LinearLayout.LayoutParams(-1, -2).apply {
                bottomMargin = dp(6)
            })
        }
    }

    private fun displayStationsOnMap() {
        val map = googleMap ?: return
        map.clear()
        if (stations.isEmpty()) return

        val validStations = stations.filter { station ->
            station.latitude.isFinite() && station.latitude in -90.0..90.0 &&
                station.longitude.isFinite() && station.longitude in -180.0..180.0
        }
        if (validStations.isEmpty()) {
            messageView.text = getString(R.string.no_valid_station_locations)
            return
        }

        val bounds = LatLngBounds.builder()
        validStations.forEach { station ->
            val position = LatLng(station.latitude, station.longitude)
            bounds.include(position)
            map.addMarker(
                MarkerOptions()
                    .position(position)
                    .title(station.name)
                    .snippet(
                        getString(
                            R.string.station_marker_summary,
                            station.availableBatterySlots,
                            station.totalBatterySlots,
                            station.capacityKwh
                        )
                    )
                    .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE))
            )?.tag = station.stationId
        }

        val uniqueLocations = validStations.distinctBy { it.latitude to it.longitude }
        if (uniqueLocations.size == 1) {
            val station = uniqueLocations.first()
            map.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(station.latitude, station.longitude), 13f))
        } else {
            mapContainer.post {
                runCatching { map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds.build(), 72)) }
            }
        }
    }

    private fun openInMaps(station: Station) {
        val uri = Uri.parse(
            "geo:${station.latitude},${station.longitude}?q=${station.latitude},${station.longitude}(${Uri.encode(station.name)})"
        )
        val intent = Intent(Intent.ACTION_VIEW, uri)
        try {
            startActivity(Intent.createChooser(intent, getString(R.string.open_station_in_maps)))
        } catch (_: ActivityNotFoundException) {
            messageView.text = getString(R.string.no_maps_app)
        }
    }

    private inner class DemoMapView : View(this@StationMapActivity) {
        private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(235, 242, 237) }
        private val roadPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(207, 222, 211)
            strokeWidth = dp(2).toFloat()
            style = Paint.Style.STROKE
        }
        private val markerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(231, 126, 67) }
        private val markerRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.STROKE
            strokeWidth = dp(3).toFloat()
        }
        private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.rgb(35, 66, 51)
            textSize = dp(12).toFloat()
            typeface = Typeface.DEFAULT_BOLD
        }

        override fun onDraw(canvas: Canvas) {
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), backgroundPaint)
            for (index in 1..5) {
                val y = height * index / 6f
                canvas.drawLine(0f, y, width.toFloat(), y - height * .18f, roadPaint)
                val x = width * index / 6f
                canvas.drawLine(x, 0f, x + width * .18f, height.toFloat(), roadPaint)
            }
            if (stations.isEmpty()) return
            val minLat = stations.minOf { it.latitude }
            val maxLat = stations.maxOf { it.latitude }
            val minLon = stations.minOf { it.longitude }
            val maxLon = stations.maxOf { it.longitude }
            val latSpan = (maxLat - minLat).coerceAtLeast(.01)
            val lonSpan = (maxLon - minLon).coerceAtLeast(.01)
            stations.forEach { station ->
                val x = dp(28) + ((station.longitude - minLon) / lonSpan * (width - dp(56))).toFloat()
                val y = height - dp(34) - ((station.latitude - minLat) / latSpan * (height - dp(88))).toFloat()
                canvas.drawCircle(x, y, dp(10).toFloat(), markerPaint)
                canvas.drawCircle(x, y, dp(10).toFloat(), markerRingPaint)
                canvas.drawText(station.name, x + dp(14), y + dp(4), labelPaint)
            }
        }

        override fun onTouchEvent(event: MotionEvent): Boolean {
            if (event.action != MotionEvent.ACTION_UP || stations.isEmpty()) return true
            val minLat = stations.minOf { it.latitude }
            val maxLat = stations.maxOf { it.latitude }
            val minLon = stations.minOf { it.longitude }
            val maxLon = stations.maxOf { it.longitude }
            val latSpan = (maxLat - minLat).coerceAtLeast(.01)
            val lonSpan = (maxLon - minLon).coerceAtLeast(.01)
            stations.minByOrNull { station ->
                val x = dp(28) + ((station.longitude - minLon) / lonSpan * (width - dp(56))).toFloat()
                val y = height - dp(34) - ((station.latitude - minLat) / latSpan * (height - dp(88))).toFloat()
                (x - event.x) * (x - event.x) + (y - event.y) * (y - event.y)
            }?.let(::openInMaps)
            return true
        }
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }

    companion object {
        private const val MAP_FRAGMENT_TAG = "station-google-map"
        private const val MAP_CONTAINER_ID_KEY = "station-map-container-id"
    }
}
