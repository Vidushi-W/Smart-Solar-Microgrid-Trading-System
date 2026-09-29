# Native Android Application

Pure native Android application using Kotlin or Java for Solar Prosumers and Grid Operators. Flutter and React Native are excluded.

Source package: `app/src/main/java/com/smartsolar/microgrid/`. Android projects can place Kotlin or Java sources in this source tree.

## Source folders

| Folder | Intended contents |
| --- | --- |
| `activities/` | Activity entry points |
| `fragments/` | Native screen fragments |
| `adapters/` | List and UI adapters |
| `models/` | Client data models |
| `api/` | REST API contracts and HTTP client integration |
| `database/` | Required Android SQLite local persistence |
| `repositories/` | Coordination of API access and local data |
| `services/` | Android services and client workflow support |
| `utils/` | Client utilities |
| `constants/` | Client constants |
| `maps/` | Google Maps integration |
| `qr/` | QR generation, display and scanning |

Resources live under `app/src/main/res/`: `layout/`, `drawable/`, `mipmap/`, `values/`, `menu/` and `navigation/`. Future local tests belong in `app/src/test/`.

## Planned Solar Prosumer features

- Registration and login.
- Profile management and account deactivation requests.
- Dashboard.
- Nearby microgrid stations and Google Maps.
- Create, modify and cancel reservations.
- Current bookings, pending bookings and booking history.
- Search and filter bookings.
- QR transaction display.

## Planned Grid Operator features

- Login and operator dashboard.
- QR scanning and reservation verification.
- Finalize energy transfer.
- View nearby stations.

## Persistence and API boundaries

SQLite stores required local Android data. MongoDB remains on the server and is accessed only through the C# REST API. Local data is not authoritative for reservation approval, QR verification or transfer finalization. Android services support client behavior; central business rules remain in backend services.

## Initialization TODO

Generate a native Android project in this directory using package `com.smartsolar.microgrid`, preserving these folders. Agree on Kotlin or Java, SDK levels and Gradle versions. Add the manifest, build files, launcher components and resources as part of that initialization.

Configure the REST endpoint, Google Maps integration and QR implementation during feature development. Keep machine-local SDK paths, signing keys and private credentials out of Git.

This scaffold has no Gradle project, Android manifest or runnable application yet.

## Authentication starter

The Kotlin contracts under `app/src/main/java/com/smartsolar/microgrid/authentication/` model the shared login request and response, supported roles, and initial routing destinations:

- `PROSUMER` -> Prosumer Home
- `GRID_OPERATOR` -> Operator Home
- `BACKOFFICE` -> Backoffice Home, if enabled by the team

The Android client should call the backend `POST /api/auth/login` endpoint. MongoDB credentials and account rules remain on the backend.

`AuthenticationApiClient` provides the initial REST call. Invoke its blocking `login` method from a background thread, persist the returned token using the app's local storage choice, and use `LoginRouter` to select the role-specific home screen.

## Run the Android client

Open the `mobile/` directory in Android Studio, allow Gradle to sync, and run the `app` configuration on an emulator. The debug build uses `http://10.0.2.2:5000` so the emulator can reach an API running on the host machine at port `5000`.

For a physical device, change `API_BASE_URL` in `app/build.gradle.kts` to the host machine's LAN address and keep the phone and host on the same network. Do not commit local SDK paths, signing keys, generated APKs, Gradle caches, or API secrets; the repository root `.gitignore` excludes them.

