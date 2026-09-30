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

