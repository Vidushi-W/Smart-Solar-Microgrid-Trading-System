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

## Operational frontend

Reservations, role dashboards, QR display and scanning use native Views and Activity navigation. Server rules remain in the C# services.

Nearby station/maps and assignment-specific local persistence remain separate future work. Keep machine-local SDK paths, signing keys and private credentials out of Git.

The native Kotlin/AppCompat application now includes Gradle configuration, a manifest, authentication/profile screens, role dashboards, reservations and QR transfer screens. See [frontend integration](../docs/frontend-integration.md) for the implemented flows and backend dependencies.

## Authentication and account screens

The Kotlin contracts under `app/src/main/java/com/smartsolar/microgrid/authentication/` model the shared login request and response, supported roles, and initial routing destinations:

- `PROSUMER` -> Prosumer Home
- `GRID_OPERATOR` -> Operator Home
- `BACKOFFICE` -> Backoffice Home, if enabled by the team

The Android client should call the backend `POST /api/auth/login` endpoint. MongoDB credentials and account rules remain on the backend.

`AuthenticationApiClient` provides the initial REST call. Invoke its blocking `login` method from a background thread, persist the returned token using the app's local storage choice, and use `LoginRouter` to select the role-specific home screen.

After login, the client calls `GET /api/auth/me` with `Authorization: Bearer <token>` before opening the role home screen. The role is read from the server response; Android does not infer administrator or operator privileges locally.

## Run the Android client

Open the `mobile/` directory in Android Studio, allow Gradle to sync, and run the `app` configuration on an emulator. The debug build uses `http://10.0.2.2:5000` so the emulator can reach an API running on the host machine at port `5000`.

The reservation client separately uses `http://10.0.2.2:5251`. For a physical device, pass Gradle properties `-PaccountApiBaseUrl=http://HOST:5000 -PreservationApiBaseUrl=http://HOST:5251` and keep the phone and host on the same network. Debug reservation calls use the existing Development identity headers from `/auth/me`; release builds send JWT only and require server JWT support. Do not commit local SDK paths, signing keys, generated APKs, Gradle caches, or API secrets.

The login screen accepts username, email, or NIC; the API determines the account role. Mobile access is limited to Prosumer and Grid Operator accounts. It links to Prosumer registration, which sends NIC, full name, email, phone number, address, password, and confirmation to `POST /api/prosumers/register`. The API creates new Prosumer accounts active immediately, and a successful submission confirms that the Prosumer can sign in now.

Prosumer account status is controlled by the API. An authenticated Prosumer can request deactivation through `POST /api/prosumers/me/deactivation`; Android cannot activate, deactivate, or reactivate an account itself. The app confirms before sending the request and prevents repeated requests after the status changes.

The Prosumer Home screen displays token-authenticated account information, reservation counts, profile pictures, and account booking actions. My Profile reads and updates through the authenticated prosumer profile API. NIC and account status are read-only. Nearby Grid Nodes remains an integration placeholder.

Both mobile roles can also open the operational reservation lists on the reservation host, including Requested, Approved, Scheduled, and completed history. Operational detail retains server actions and history; eligible Prosumers can display or reissue their transaction QR. Account booking detail retains main's modify and cancellation summaries.

Grid Operators receive account bookings, a working QR scanner and energy-transfer confirmation, and the staff profile screen. The operator profile uses GET and PUT /api/users/me/profile; the API derives the account ID and role from the JWT and accepts only Backoffice/Grid Operator roles.

On launch and when returning to a role home, the app revalidates the stored JWT through `GET /api/auth/me`. The endpoint rejects accounts that have become inactive, after which Android clears its local session and returns to login. Backoffice sign-in is not enabled in the mobile client. Prosumer and Grid Operator profiles can choose a picture from the gallery; Android resizes it to JPEG before the authenticated profile update stores it in the user record. The API accepts images up to 750 KB and provides a default initial avatar when no picture is set.
