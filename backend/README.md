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

