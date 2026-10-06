import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val localProperties = Properties().apply {
    val localFile = rootProject.file("local.properties")
    if (localFile.exists()) localFile.inputStream().use { stream -> load(stream) }
}
val mapsApiKey = providers.environmentVariable("GOOGLE_MAPS_API_KEY")
    .orElse(localProperties.getProperty("GOOGLE_MAPS_API_KEY") ?: "")
    .get()

android {
    namespace = "com.smartsolar.microgrid"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.smartsolar.microgrid"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField("String", "API_BASE_URL", "\"${providers.gradleProperty("accountApiBaseUrl").getOrElse("http://10.0.2.2:5000")}\"")
        buildConfigField("String", "RESERVATION_API_BASE_URL", "\"${providers.gradleProperty("reservationApiBaseUrl").getOrElse("http://10.0.2.2:5251")}\"")
        buildConfigField("boolean", "MAPS_API_KEY_CONFIGURED", mapsApiKey.isNotBlank().toString())
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] = mapsApiKey
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
implementation("androidx.camera:camera-camera2:1.4.2")
implementation("androidx.camera:camera-lifecycle:1.4.2")
implementation("androidx.camera:camera-view:1.4.2")
implementation("com.google.mlkit:barcode-scanning:17.3.0")

implementation("androidx.lifecycle:lifecycle-viewmodel:2.8.7")
implementation("androidx.lifecycle:lifecycle-livedata:2.8.7")
implementation("com.journeyapps:zxing-android-embedded:4.3.0")
implementation("com.google.android.gms:play-services-maps:20.0.0")
}
