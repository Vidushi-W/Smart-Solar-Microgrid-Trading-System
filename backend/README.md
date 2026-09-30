# Backend

C# ASP.NET Core REST Web API with MongoDB, intended for hosting on IIS.

## Folder responsibilities

| Folder | Intended contents |
| --- | --- |
| `src/Controllers/` | HTTP endpoints, request/response handling and service delegation |
| `src/Models/` | Server-side domain and MongoDB document models |
| `src/DTOs/` | REST request and response contracts |
| `src/Services/` | FAT Services containing business rules and workflow orchestration |
| `src/Interfaces/` | Service and repository contracts |
| `src/Repositories/` | MongoDB persistence operations |
| `src/Configuration/` | Configuration types and dependency registration |
| `src/Middleware/` | Cross-cutting HTTP pipeline behavior |
| `src/Validators/` | Input validation used by the API |
| `src/Helpers/` | Small supporting utilities |
| `src/Constants/` | Shared server constants |
| `tests/` | Future backend tests |

## Planned scope

Authentication, role-based access, user management, prosumer management and activation, microgrid node/station management, energy booking slots, energy reservations, dashboard data, QR verification and Grid Operator operations.

Primary roles: Backoffice, Grid Operator, Solar Prosumer.

Planned MongoDB concepts: `UserDetails`, `SolarStationInfo`, `EnergyBookingSlots`, `EnergyReservation`. Schemas and relationships are to be agreed between components.

## Design boundaries

Controllers stay thin. Services own authoritative decisions such as permissions, availability, reservation changes and transfer finalization. Repositories perform persistence; they do not replace the service layer. Clients must never receive MongoDB credentials or access the database directly.

## User management API

Backoffice-only endpoints manage Web application users with the `Backoffice` and `GridOperator` roles:

- `GET /api/users` - list users without password hashes.
- `GET /api/users/{id}` - view one user.
- `POST /api/users` - create a user and securely hash the password.
- `PUT /api/users/{id}` - update permitted profile fields, role, and optionally password.
- `PATCH /api/users/{id}/status` - activate or deactivate an account.

The API validates required fields, email format, password length, allowed Web roles, and duplicate usernames. MongoDB operations and password hashing remain in backend services; the Web client never accesses MongoDB directly.

## Prosumer account lifecycle

Prosumer status is stored centrally in `AccountStatus`:

`PendingActivation` -> `Active` -> `DeactivationRequested` -> `Deactivated` -> `Active`

- `GET /api/prosumers/pending` - Backoffice queue for pending and requested-deactivation prosumers.
- `GET /api/prosumers/deactivated` - Backoffice-only list of deactivated prosumers.
- `POST /api/prosumers/{id}/activate` - Backoffice activates a pending prosumer.
- `POST /api/prosumers/{id}/deactivate` - Backoffice processes a deactivation request.
- `POST /api/prosumers/{id}/reactivate` - Backoffice reactivates a deactivated prosumer.
- `POST /api/prosumers/me/deactivation` - An authenticated Prosumer requests deactivation.

Only `AccountStatus = Active` and `IsActive = true` can authenticate. Invalid state transitions are rejected by the API, and Backoffice authorization is required for activation, deactivation processing, and reactivation.

## Prosumer profile API

Authenticated Prosumer profile operations are token-scoped:

- `GET /api/prosumers/me/profile` - returns NIC, name, email, phone, address, and account status.
- `PUT /api/prosumers/me/profile` - updates name, email, phone, and address only.

The API obtains the user ID from the JWT subject claim. NIC is returned as the primary identifier but is not accepted in the update request, so a Prosumer cannot edit another account by submitting someone else's NIC.

## Prosumer registration API

`POST /api/prosumers/register` is public and is called by Android.

```json
{
	"nic": "200012345678",
	"fullName": "Example Prosumer",
	"email": "prosumer@example.com",
	"phoneNumber": "+94111234567",
	"address": "Example address",
	"password": "password123",
	"confirmPassword": "password123"
}
```

The API accepts either 12-digit NICs or legacy 9-digit NICs ending in `V`/`X`, normalizes them to uppercase, and enforces a MongoDB unique index. New accounts are always created with role `Prosumer`, `IsActive = false`, and `AccountStatus = PendingActivation`. Duplicate NICs return `409 Conflict`; validation errors return `400 Bad Request`; successful submissions return `202 Accepted`.

## Login API

`POST /api/auth/login`

Request:

```json
{
	"identifier": "username-or-nic",
	"password": "password"
}
```

Successful response:

```json
{
	"message": "Login successful",
	"role": "GridOperator",
	"token": "..."
}
```

The API accepts `Username` or `Nic`, rejects missing or incorrect credentials, rejects inactive accounts, and signs a JWT containing the user's role.

Protected requests must include:

```text
Authorization: Bearer <token>
```

`GET /api/auth/me` is a protected verification endpoint. It returns the authenticated user ID, username, and role only when the JWT signature, issuer, audience, and expiry are valid. Role policies are available as `BackofficeOnly`, `GridOperatorOnly`, and `ProsumerOnly` for protected feature endpoints.

Current authorization boundaries include:

- `BackofficeOnly`: `/api/users`, pending prosumers, activation, and reactivation.
- `GridOperatorOnly`: `/api/operations/bookings`.
- `ProsumerOnly`: `/api/prosumers/me/deactivation`.
- Any authenticated role: `/api/auth/me` and `/api/prosumers/me`.

The protected workflow endpoints currently return `501 Not Implemented` after authorization succeeds because their business services and repositories belong to later component slices. An authenticated user with the wrong role is rejected with `403 Forbidden` before the controller action runs.

For local development, store the connection string and signing key with .NET User Secrets. They are kept outside the repository and persist across terminals. Run these setup commands once from the `backend` directory, replacing the MongoDB value with your local or Atlas connection string:

```powershell
dotnet user-secrets set "MongoDb:ConnectionString" "your-mongodb-connection-string" --project .\src\SolarMicrogridTrading.Api.csproj
dotnet user-secrets set "Jwt:Key" "a-long-local-signing-key-at-least-32-characters" --project .\src\SolarMicrogridTrading.Api.csproj
dotnet run --project .\src\SolarMicrogridTrading.Api.csproj
```

The values are then available whenever you run the API using its Development launch profile. Environment variables (`MONGODB_CONNECTION_STRING` and `JWT_KEY`) remain supported for deployment. Do not commit the MongoDB URI or JWT key. Passwords must be stored as ASP.NET Core `PasswordHasher<User>` hashes, never plaintext.

## Station API (initial implementation)

The ASP.NET Core API project is `src/SmartSolar.Microgrid.Api.csproj`. Run it from the repository root with:

```powershell
dotnet run --project backend/src/SmartSolar.Microgrid.Api.csproj
```

The default local configuration targets `mongodb://localhost:27017/solar_microgrid_dev`. Override settings with environment variables for another development/test deployment:

```powershell
$env:MongoDB__ConnectionString = "mongodb://localhost:27017"
$env:MongoDB__DatabaseName = "solar_microgrid_dev"
$env:Stations__NearbyRadiusKilometers = "25"
```

The nearby radius defaults to 25 km and is configurable through `Stations:NearbyRadiusKilometers`. The API exposes station creation, listing, nearby search, update, and deactivation under `/api/stations`.

Energy booking slots are created under `/api/stations/{stationId}/slots`, updated/deleted under `/api/slots/{slotId}`, and listed for a station/date under `/api/stations/{stationId}/slots?date=yyyy-MM-dd`. The API rejects overlapping windows for the same station and date. Slot deletion uses `ISlotReservationChecker` and returns 503 until Member 3 implements that contract; it does not guess the reservation schema.

The existing account endpoints retain their JWT and role policies. The incoming station, slot, and QR controllers do not yet declare authorization policies; keep those routes on a trusted development network until their authorization is wired.

Station deactivation uses `IStationReservationChecker`. Its temporary implementation fails closed with HTTP 503 because the Reservations model/collection contract is not present yet. Replace it with Member 3's reservation query before enabling deactivation. A detected Pending or Approved reservation returns HTTP 409.

## Remaining backend initialization

- Agree and implement shared authentication, role policies, and the Reservations model/query contract.
- Add backend tests under `tests/`.
- Document deployment and IIS hosting once those settings are implemented.

## QR energy-transfer foundation

The backend now exposes token issuance, QR verification and explicit transfer completion.
See [the QR implementation and testing guide](QR-ENERGY-TRANSFER.md) for the repository
findings, schema assumptions, contracts, security decisions and manual examples.

- `POST /api/reservations/{id}/qr`: issue/rotate a QR for an Approved or Scheduled reservation.
- `POST /api/transactions/verify`: verify against MongoDB and return an operator-bound confirmation receipt.
- `POST /api/transactions/{id}/complete`: consume that receipt and atomically mark a Scheduled reservation Completed.

These routes require a trusted authenticated identity. With the current scaffold,
they return 403 until Member 1 connects shared authentication. There is no development
authentication bypass in the application. The new minimal `EnergyReservation` projection
must be aligned with Member 3 before integrating the reservation lifecycle; no reservation
creation, approval or scheduling endpoints were added.

Run the isolated MongoDB/HTTP checks from the repository root with .NET 8 and MongoDB running:

```powershell
dotnet build backend/src/SmartSolar.Microgrid.Api.csproj
dotnet run --project backend/tests/QrTransfer.IntegrationChecks/QrTransfer.IntegrationChecks.csproj
```

The test executable creates and removes its own uniquely named database ending in `_test`.
Its fixed test identities run only inside the test host; they do not enable login in the API.

