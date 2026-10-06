# QR-Based Energy Transfer Verification — backend foundation

## Repository findings before implementation

Current runtime: both backend hosts and the QR integration checks now target .NET 10. The .NET 8 references below describe the original implementation and validation history.

The current branch is `feature/qr-energy-transfer-/-vidushi`. The initial working tree
was clean. Repository source, structure, documentation, client contracts and lifecycle
logic were inspected before implementation. No branch switch, merge, rebase, commit,
push or pull request was performed.

| Area | Existing implementation |
| --- | --- |
| Backend | .NET 8 ASP.NET Core Web API, MongoDB.Driver 3.12.0, controllers → FAT services → repositories |
| Reservation models/collection | `EnergyReservation` named in architecture documentation, but no backend model, repository, service, configured collection or routes existed |
| Booking model | `EnergyBookingSlots`: string `_id`/`SlotId`, `stationId`, UTC calendar date, HH:mm start/end, integer total/remaining capacity, Open/Full/Closed status |
| Station model | `SolarStationInfo`: string `_id`/`StationId`, name, coordinates, energy/battery capacity, operating schedule, Active/Deactivated status |
| Controllers | `StationsController`, `StationSlotsController`, `EnergyBookingSlotsController` |
| Services/repositories | Station and slot interfaces, FAT services and MongoDB repositories; async methods and cancellation tokens |
| DTOs | Station write/response and booking-slot write/response DTOs with DataAnnotations; no reservation/QR DTOs |
| DI/configuration | Shared singleton MongoClient/IMongoDatabase, validated MongoDbSettings and StationOptions, scoped application services/repositories, JSON string enums, ProblemDetails |
| Reservation checks | `IStationReservationChecker` and `ISlotReservationChecker` deliberately return Unavailable/503 until Member 3 provides queries |
| Approval | React `DataContext` implements demo approval, scheduling, verification and completion using browser session data; no server approval endpoint |
| Lifecycle | React uses Requested, Approved, Scheduled, Completed, Cancelled, Rejected. Backend station-check documentation also mentions Pending |
| Transfer prerequisite | React `canCompleteTransfer` requires Scheduled plus Verified QR; scheduling is separate from approval and verification |
| Roles | React has Backoffice and GridOperator; architecture/proposed routes identify Prosumer; there is no backend authentication or Users model |
| IDs | Server stations use `st-{guid}`, slots use `slot-{guid}`. Demo reservations use `rs-...`; demo transactions use `tx-...`. No agreed server reservation/booking ID generator exists |
| QR fields | Browser-only transaction objects have `reservationId`, `tokenStatus`, `updatedAt`; states AwaitingQR/Issued/Verified/Used. No real tokens or backend transaction schema existed |
| Reusable routes | Existing web contract proposes `/reservations/{id}/qr`, `/transactions/verify`, `/transactions/{id}/complete`; these were not server endpoints |
| Android | Directory placeholders and README only; no runnable Gradle application, scanner or MongoDB access |
| React API integration | Station and slot screens call the real API; reservation and transaction screens remain demonstrations |

The implementation reuses the existing namespaces, folders, shared MongoDB connection,
configuration, scoped DI, async patterns, BSON naming, DataAnnotations and ProblemDetails.
It preserves the station/slot services and their fail-closed reservation checkers.
It does not duplicate station/slot models or introduce a separate transaction collection.

## Files and responsibilities

All paths below are relative to `backend/`.

| File | Change and reason |
| --- | --- |
| `src/Models/EnergyReservation.cs` | New minimal reservation projection and embedded QR state, because no server reservation model existed |
| `src/DTOs/QrTransferContracts.cs` | New token-only request contracts and authoritative response contracts |
| `src/Interfaces/IQrTransferRepository.cs` | New persistence boundary with conditional atomic update |
| `src/Interfaces/IQrTransferService.cs` | New business-operation contracts and typed failure results |
| `src/Repositories/MongoQrTransferRepository.cs` | New adapter to the documented EnergyReservation collection; reads by `_id`, updates selected fields without replacing reservation documents |
| `src/Services/QrTransferService.cs` | New FAT service for authorization, token issuance, verification, state checks and completion |
| `src/Controllers/QrTransfersController.cs` | New thin HTTP routes using existing ProblemDetails conventions; no-store responses |
| `src/Configuration/MongoDbSettings.cs` | Adds configurable `ReservationsCollectionName` |
| `src/appsettings.json` | Sets that collection name to `EnergyReservation` |
| `src/Program.cs` | Adds two scoped DI registrations only |
| `tests/QrTransfer.IntegrationChecks/QrTransfer.IntegrationChecks.csproj` | New executable integration test project; references the API without additional test packages |
| `tests/QrTransfer.IntegrationChecks/IntegrationChecks.cs` | New real MongoDB/HTTP tests with isolated fixture data and test-only authenticated identities |
| `README.md` | Links this guide and documents routes, integration prerequisites and test commands |
| `QR-ENERGY-TRANSFER.md` | This implementation, integration and manual-testing guide |

Every new C# file has a purpose header and method comments. React, Android and unrelated
backend implementations were not changed.

## Reservation contract and MongoDB fields

This is an explicit foundation assumption, not a claim that Member 3 supplied a schema.
Align this projection with their implementation before integrating it. The repository
does not create reservations, approve them, schedule them or insert application seed data.

Collection: `EnergyReservation`, configurable using `MongoDB__ReservationsCollectionName`.

| Field | Type | Purpose |
| --- | --- | --- |
| `_id` | String | Existing reservation identifier; built-in unique MongoDB index |
| `prosumerId` | String | Authoritative owner ID matching the authenticated prosumer ID |
| `stationId` | String | Reference to SolarStationInfo `_id` |
| `slotId` | String | Reference to EnergyBookingSlots `_id` |
| `energyKwh` | Number/double | Reserved energy amount |
| `status` | String | Authoritative lifecycle state; completion changes it to Completed |
| `qrTransfer.tokenHash` | String | SHA-256 of random QR token; raw token never persisted |
| `qrTransfer.tokenStatus` | String | Issued → Verified → Used |
| `qrTransfer.issuedAtUtc` | BSON date | Server issuance timestamp |
| `qrTransfer.verificationHash` | String/null | Hash of confirmation receipt; cleared on completion |
| `qrTransfer.verifiedBy` | String/null | Authenticated operator ID |
| `qrTransfer.verifiedAtUtc` | BSON date/null | Server verification timestamp |
| `qrTransfer.reservationFingerprint` | String/null | Hash binding receipt to reservation ID, owner, station, slot, energy and status |
| `qrTransfer.completedBy` | String/null | Authenticated completing operator ID |
| `qrTransfer.completedAtUtc` | BSON date/null | Server completion timestamp |

Other reservation fields are ignored by the projection and preserved in MongoDB.
QR state is stored in one document so consuming the token and completing the reservation
do not require a replica-set transaction. No new indexes are needed for lookup by `_id`.
Conditional updates match all projected reservation fields and the previous QR state;
only one competing completion can succeed. There is no upsert.

For this foundation, `transactionId` equals `reservationId`. It is not the React demo's
`tx-...` identifier. Clients must use the returned transaction ID. A separate transaction
ledger and migration of demo IDs are outside this task.

## Authentication integration

The service accepts only authenticated server `ClaimsIdentity` instances with a nonempty
`ClaimTypes.NameIdentifier` and the relevant role claim. Member 1 must install trusted
authentication before controllers run and map their subject and roles accordingly.
No user ID, role, ownership, status or completion timestamp is accepted from the body.
Neither arbitrary bearer strings nor `X-Test-Actor` headers authenticate the actual API.

- Issue QR: owning `Prosumer`, or `Backoffice` for the approval handoff.
- Verify and complete: `GridOperator` only.
- Missing authentication, wrong roles, wrong ownership or mismatched QR: 403.

Because no authentication handler exists yet, normal requests to the new API routes
currently fail closed with 403 (malformed bodies may first receive model-binding 400).
This is an integration prerequisite, not a working login implementation. Existing
station and slot routes retain their previous behavior.

## Endpoints and DTOs

| Method and route | Request | Success response |
| --- | --- | --- |
| `POST /api/reservations/{id}/qr` | No body | 200 `IssueQrResponse` containing `transactionId`, `qrPayload` |
| `POST /api/transactions/verify` | `VerifyQrRequest`: `version`, `reservationId`, `token` | 200 `QrTransferResponse` with reservation details and `verificationToken` |
| `POST /api/transactions/{id}/complete` | `CompleteEnergyTransferRequest`: `token`, `verificationToken` | 200 `QrTransferResponse` with Completed/Used and completion audit fields |

`QrPayload` is the versioned object to JSON-encode as the QR content:

```json
{
  "version": 1,
  "reservationId": "rs-example",
  "token": "<64 uppercase hexadecimal characters returned by the API>"
}
```

It contains no prosumer name, NIC, station details, energy amount or trusted status.
The token contains 256 random bits from `RandomNumberGenerator`. Hashes are compared
in constant time. Receipt tokens use the same format. Identifiers are limited to 200
characters and both token inputs must match the exact 64-character uppercase hex format.
Only version 1 is supported; omitted version is invalid.

Issuing again rotates the token and clears previous verification. The old QR immediately
stops working. The raw token is returned only on issuance; a lost response requires
another issuance. Concurrent changes can return 409, requiring a fresh request.

Verification accepts Approved or Scheduled reservations, reads real MongoDB data and
records Verified plus an operator-bound receipt. It does **not** mark the reservation
Completed. Re-verification replaces the old receipt; only the latest receipt works.

Completion requires Scheduled, a matching QR token, Verified state, the latest matching
receipt, the same operator, and an unchanged reservation fingerprint. Scheduling an
Approved reservation after verification requires verifying again. Completion re-reads
and revalidates everything, then atomically sets Completed and Used, records the operator
and server UTC time, and clears the receipt hash.

### HTTP failures

| Status | Examples |
| --- | --- |
| 400 | Empty/malformed inputs, unsupported payload version, invalid token format |
| 403 | Missing/wrong identity, non-owner issuance, token belongs to a different reservation or was rotated |
| 404 | Reservation does not exist |
| 409 | Wrong lifecycle state, completed/used QR, completion without verification, stale receipt, different verifying operator, concurrent change |

Failures use ProblemDetails; model validation uses ValidationProblemDetails. Database
outages continue through the existing application exception handler; success is not
fabricated. Missing/invalid reference IDs or nonpositive/nonfinite energy make a reservation
ineligible. Reference existence, station operating hours, time windows, pricing, energy
meter readings and capacity-release rules are left to the reservation component; no
new rules were invented for them.

## Manual API walkthrough

The authenticated walkthrough requires Member 1's real authentication integration.
Until then use the integration executable below to exercise success and failure paths
against MongoDB without weakening the actual application.

Start the API from the repository root:

```powershell
dotnet run --project backend/src/SmartSolar.Microgrid.Api.csproj --urls http://localhost:5000
```

Use a real reservation supplied by Member 3 with string `_id`, owner, existing station
and slot references, positive `energyKwh` and Approved/Scheduled status. For an isolated
manual database only, the following is the equivalent sample MongoDB document (substitute
real fixture owner/station/slot IDs). This is not an approval endpoint or application seed:

```javascript
// In mongosh connected to a disposable database ending in _test:
if (!db.getName().endsWith("_test")) throw new Error("Use an isolated test database");
db.EnergyReservation.insertOne({
  _id: "rs-example",
  prosumerId: "<fixture-owner-subject>",
  stationId: "<fixture-station-id>",
  slotId: "<fixture-slot-id>",
  energyKwh: 12.5,
  status: "Scheduled"
});
```

Configure `MongoDB__DatabaseName` to that test database before starting the API if using
the sample. Do not repurpose a teammate's development reservation just to test completion.

Once authentication is integrated, obtain an owner access token and an operator access
token from the shared login flow, then run:

```powershell
$base = 'http://localhost:5000/api'
$reservationId = 'rs-example'
$ownerHeaders = @{ Authorization = "Bearer $ownerAccessToken" }
$operatorHeaders = @{ Authorization = "Bearer $operatorAccessToken" }

# 1. Issue; JSON-encode qrPayload to display it as a QR later in Android.
$issued = Invoke-RestMethod -Method Post -Uri "$base/reservations/$reservationId/qr" -Headers $ownerHeaders
$qrJson = $issued.qrPayload | ConvertTo-Json -Compress

# 2. Scan/verify; display the returned authoritative details for operator review.
$verified = Invoke-RestMethod -Method Post -Uri "$base/transactions/verify" -Headers $operatorHeaders -ContentType 'application/json' -Body $qrJson
$verified

# 3. Only after explicit operator confirmation:
$confirmation = @{
  token = $issued.qrPayload.token
  verificationToken = $verified.verificationToken
} | ConvertTo-Json
$completed = Invoke-RestMethod -Method Post -Uri "$base/transactions/$($verified.transactionId)/complete" -Headers $operatorHeaders -ContentType 'application/json' -Body $confirmation
$completed

# 4. Repeat the identical request: expect HTTP 409, with no second completion.
Invoke-RestMethod -Method Post -Uri "$base/transactions/$($verified.transactionId)/complete" -Headers $operatorHeaders -ContentType 'application/json' -Body $confirmation
```

Example verification response (token placeholders are explanatory, not valid credentials):

```json
{
  "transactionId": "rs-example",
  "reservationId": "rs-example",
  "prosumerId": "fixture-owner",
  "stationId": "fixture-station",
  "slotId": "fixture-slot",
  "energyKwh": 12.5,
  "reservationStatus": "Scheduled",
  "tokenStatus": "Verified",
  "verificationToken": "<64-character server-issued receipt>",
  "completedAtUtc": null,
  "completedBy": null
}
```

The completion response has the same reservation fields with:

```json
{
  "reservationStatus": "Completed",
  "tokenStatus": "Used",
  "verificationToken": null,
  "completedAtUtc": "2026-09-29T10:00:00Z",
  "completedBy": "fixture-operator"
}
```

Example repeat-completion ProblemDetails (framework may include type and traceId):

```json
{
  "status": 409,
  "title": "Reservation is ineligible or the QR has already been used."
}
```

For negative manual tests: remove authentication (403), change a valid QR token (403),
use a missing reservation ID (404), omit version/use malformed tokens (400), complete
before verification (409), use another operator's receipt (409), or cancel/change the
reservation after verification (409). For Approved records, issuance/verification can
succeed but completion requires the separate scheduling workflow and fresh verification.

## Automated verification and actual results

```powershell
dotnet build backend/src/SmartSolar.Microgrid.Api.csproj
# Optional MongoDB override; default is mongodb://127.0.0.1:27017:
$env:QR_TEST_MONGO = 'mongodb://127.0.0.1:27017'
dotnet run --project backend/tests/QrTransfer.IntegrationChecks/QrTransfer.IntegrationChecks.csproj
```

This is an executable integration suite, not a `dotnet test` project. It uses a randomly
named `qr_transfer_<guid>_test` database and a loopback HTTP host on an ephemeral port.
It creates real station, slot and reservation fixtures through the existing API/MongoDB
architecture and drops only its own database in `finally`. The fixed identities in
this test project are absent from the application host.

Checks cover authorization/ownership, invalid payloads, missing/mismatched reservations,
ineligible states, issuance rotation, SHA-256-only storage, verification without completion,
confirmation receipt enforcement, stale reservation details/status, operator binding,
actual completion/audit response, replay rejection and preservation of unknown fields.
Eight concurrent completion requests must produce exactly one 200 and seven 409 responses.
Existing station create/list/nearby/update, slot create/list/update, overlap rejection,
and the intentional station-deactivation/slot-deletion 503 results are also exercised.

Recovery verification on 2026-09-29: the backend built with zero warnings and zero errors,
and all 49 HTTP/persistence checks passed against the running MongoDB server. The suite
removed its isolated test database after completing. A separate smoke check before the
interruption confirmed that the actual application host rejects forged bearer/test-actor
headers with 403, and an existing station validation route still returns 400.

Recovery found four modified tracked files and ten untracked files, all belonging to
this QR task. The implementation and tests were already complete. No C# files, routes,
models or registrations were recreated or changed after reconnecting; only this guide
was updated to record the repeated build/test results. Shared authentication and the
reservation lifecycle integration remain the prerequisites documented below.

The machine initially had no .NET SDK on PATH. A workspace-local .NET 8.0.425 SDK was
installed under `../tmp/qr-tools/dotnet` outside this repository; no SDK or downloaded
dependencies were added to Git. Local checks used that executable with isolated CLI
and NuGet cache directories. MongoDB Server 8.2 was already running.

## Before implementing the Android scanner

1. Member 1 must connect authentication and map NameIdentifier plus Backoffice,
   GridOperator and Prosumer roles. Confirm the owning prosumer's subject matches `prosumerId`.
2. Member 3 must align the minimal reservation schema/collection, string IDs, Approved →
   Scheduled → Completed flow and issuance handoff. Their writes must preserve `qrTransfer`
   and respect Completed as terminal. Reservation edits should invalidate verification;
   if additional fields such as time or service type affect transfer, include them in
   the projection, fingerprint, returned details and conditional update.
3. Agree how QR rotation/delivery works after approval. The current endpoint issues on
   demand; automatic issuance is not wired to a nonexistent approval service. Reissuing
   invalidates the previous QR and receipt. Expiry/recovery policies remain team decisions.
4. Keep capacity accounting, billing and transaction history in the agreed reservation
   lifecycle. This foundation does not release slot capacity or append to an unagreed
   history schema. Station/slot reservation checkers still await Member 3's implementation.
5. Android should encode the returned `qrPayload`, send a scanned payload to verify,
   display the authoritative response, retain the latest receipt for that operator, and
   call complete only after confirmation. Handle 409 by refreshing/re-verifying; never
   decide eligibility locally or connect Android to MongoDB.

There is no scanner, QR bitmap generation, Google Maps work, React integration,
transaction listing endpoint or independent transaction ledger in this backend-only task.
