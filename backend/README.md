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

Planned MongoDB concepts: `Users`, `SolarStationInfo`, `EnergyBookingSlots`, `EnergyReservation`. Schemas and relationships are to be agreed before implementation.

## Design boundaries

Controllers stay thin. Services own authoritative decisions such as permissions, availability, reservation changes and transfer finalization. Repositories perform persistence; they do not replace the service layer. Clients must never receive MongoDB credentials or access the database directly.

## Initialization TODO

- Select the .NET SDK and generate the Web API project into `src/`.
- Configure MongoDB through local configuration or environment variables.
- Define REST contracts, authentication and role policies.
- Add a test project under `tests/`.
- Document local run commands and IIS deployment after implementation.

No project file, endpoints, configuration secrets or deployment files are supplied by this scaffold.

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

Set secrets through environment variables before running the API:

```powershell
$env:MONGODB_CONNECTION_STRING = "your-mongodb-connection-string"
$env:JWT_KEY = "a-long-local-signing-key-at-least-32-characters"
dotnet run --project .\src\SolarMicrogridTrading.Api.csproj
```

Do not commit the MongoDB URI or JWT key. Passwords must be stored as ASP.NET Core `PasswordHasher<User>` hashes, never plaintext.

