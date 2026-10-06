# Backend

C# ASP.NET Core REST Web API with MongoDB, intended for hosting on IIS.

Both backend hosts and their test projects target .NET 10. Install the .NET 10 SDK to build and run them. The account/QR JWT package uses version 10.0.12, matching the reservation host's ASP.NET Core OpenAPI package. Identity is supplied by the ASP.NET Core shared framework.

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

Authenticated self-profile updates may include an optional `profilePictureData` JPEG data URL. The API rejects non-JPEG formats and decoded images larger than 750 KB; omitted values preserve the existing picture, and an empty string removes it.

### Initial Backoffice account

The API intentionally has no default Backoffice credentials. The demo credentials in the Web client are local sample data and are not MongoDB accounts. To create the first real Backoffice account, run the one-time bootstrap tool from an interactive terminal in `backend/src`:

```powershell
dotnet run --project ..\tools\BootstrapBackoffice\BootstrapBackoffice.csproj
```

It is a standalone utility and does not rebuild or replace the running API. It reads the same MongoDB connection string and database settings as the API, refuses to run if any Backoffice account already exists, prompts for the account details, masks password input, hashes the password with ASP.NET Identity, and asks you to confirm the target database before inserting. MongoDB must be reachable. For MongoDB Atlas, get the **driver connection string** from Atlas **Connect → Drivers**; the browser URL for the Atlas dashboard is not a database connection string. Set it locally in PowerShell as ` $env:MONGODB_CONNECTION_STRING = Read-Host "Atlas connection string" ` (do not paste database credentials into chat or commit them). The same variable must be set when starting the API so it uses the same database. The new account is active and uses the standard login page.

## Prosumer account lifecycle

Prosumer status is stored centrally in `AccountStatus`:

`PendingActivation` -> `Active` -> `DeactivationRequested` -> `Deactivated` -> `Active`

- `GET /api/prosumers/pending` - Backoffice queue for pending and requested-deactivation prosumers.
- `GET /api/prosumers/deactivated` - Backoffice-only list of deactivated prosumers.
- `POST /api/prosumers/{id}/activate` - Backoffice activates a pending prosumer.
- `POST /api/prosumers/{id}/deactivate` - Backoffice processes a deactivation request.
- `POST /api/prosumers/{id}/reactivate` - Backoffice reactivates a deactivated prosumer.
- `POST /api/prosumers/me/deactivation` - an authenticated Prosumer requests deactivation.

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

## Station and slot API

Run the API from the repository root with:

```powershell
dotnet run --project backend/src/SmartSolar.Microgrid.Api.csproj
```

The local configuration targets `mongodb://localhost:27017`. Override settings with environment variables for another development or test deployment:

```powershell
$env:MongoDb__ConnectionString = "mongodb://localhost:27017"
$env:MongoDb__DatabaseName = "SolarMicrogridDB"
$env:Stations__NearbyRadiusKilometers = "25"
```

The API exposes station creation, listing, nearby search, update, and deactivation under `/api/stations`. Energy booking slots are created under `/api/stations/{stationId}/slots`, updated or deleted under `/api/slots/{slotId}`, and listed for a station and date under `/api/stations/{stationId}/slots?date=yyyy-MM-dd`.

Station deactivation and slot deletion fail closed with HTTP 503 until the Reservations model/query contract is connected. A detected Pending or Approved reservation returns HTTP 409.
