# Architecture

## Request flow

```text
React web client -------- REST ------> ASP.NET Core Web API ------> MongoDB
Native Android client -- REST ------>   Controllers
       |                                FAT Services
       +-- SQLite (local only)          Repositories
```

The API is intended for IIS hosting. All central business logic belongs in API services. Controllers expose HTTP contracts, services enforce business rules, and repositories access MongoDB.

## Roles

| Role | Clients | Planned capabilities |
| --- | --- | --- |
| Backoffice | Web | Users, prosumers and activations, stations, slots, reservations, dashboard |
| Grid Operator | Web and Android | Operational views, bookings and reservations; Android QR verification and energy transfer finalization |
| Solar Prosumer | Android | Account and profile, stations/maps, reservations, bookings, QR display |

The API must enforce access for every operation. Hiding client controls does not establish authorization.

## Data ownership

- MongoDB: central server-side concepts `Users`, `SolarStationInfo`, `EnergyBookingSlots` and `EnergyReservation`.
- SQLite: required Android local persistence in `mobile/app/src/main/java/com/smartsolar/microgrid/database/`.
- Clients: presentation, navigation, API communication and appropriate local state.

Google Maps belongs to the Android maps integration. QR rendering/scanning belongs to the Android QR integration; authoritative QR and reservation verification belongs to the backend.

## Decisions pending implementation

Framework and SDK versions, API routes and DTOs, authentication strategy, exact role permissions, MongoDB schemas, reservation rules, SQLite schema and refresh behavior, QR payload design and deployment configuration are not defined by this scaffold.

