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

Authentication and role authorization are not implemented in this scaffold, so these endpoints are not yet protected. Do not expose this API beyond a trusted development environment until Member 1 adds the shared authentication and authorization middleware.

Station deactivation uses `IStationReservationChecker`. Its temporary implementation fails closed with HTTP 503 because the Reservations model/collection contract is not present yet. Replace it with Member 3's reservation query before enabling deactivation. A detected Pending or Approved reservation returns HTTP 409.

## Remaining backend initialization

- Agree and implement shared authentication, role policies, and the Reservations model/query contract.
- Add backend tests under `tests/`.
- Document deployment and IIS hosting once those settings are implemented.

