# Web Application

Responsive React application for Backoffice users and Grid Operators. All server interaction goes through the REST API.

## Folder responsibilities

| Folder under `src/` | Intended contents |
| --- | --- |
| `assets/images/`, `assets/icons/` | UI assets |
| `components/common/`, `components/layout/` | Reusable controls and page layouts |
| `components/forms/`, `components/tables/` | Reusable form and table presentation |
| `pages/auth/` | Login screens |
| `pages/dashboard/` | Role-specific dashboards |
| `pages/users/` | User management |
| `pages/prosumers/` | Prosumer management and pending activations |
| `pages/stations/` | Microgrid node/station management and operational information |
| `pages/bookings/` | Energy slot management and booking views |
| `pages/reservations/` | Reservation management and monitoring |
| `services/` | REST API communication |
| `hooks/`, `context/` | React hooks and shared UI state |
| `utils/`, `constants/` | Client helpers and constants |
| `routes/` | Routing and navigation |
| `styles/` | Responsive styling |

`public/` holds public static assets. `tests/` is reserved for future tests.

## Planned interfaces

- Backoffice: login, dashboard, user management, prosumer management, pending prosumer activations, microgrid node management, energy slot management and reservation management.
- Grid Operator: login, dashboard, bookings, reservation monitoring and operational information management.

## Run the console

From the `web` directory:

```bash
npm install
npm run dev
```

Open http://localhost:5173

Demonstration sign-in, password `demo1234` for every sample account:

- Backoffice Officer: `backoffice@solarmicrogrid.lk`
- Grid Operator: `operator@solarmicrogrid.lk`

The screens use data stored in the browser session. **Reset data** in the top bar restores the sample records. Nothing is saved to MongoDB. Copy `.env.example` to `.env` when a member is ready to point the client at the C# API (`VITE_API_BASE_URL`).

`npm run build` produces a static bundle in `dist/`. `npm run preview` serves that bundle locally.

If `npm install` fails with HTTP 403 and a message that Npmjs is blocked, this network is filtering `registry.npmjs.org`. Install once with a mirror, then keep the lockfile on the official registry:

```bash
npm install --strict-ssl false --registry https://registry.npmmirror.com
```

## What the screens cover

| Screen | Who can open it | Team area |
| --- | --- | --- |
| Dashboard | Both roles | Shared reservation counts |
| Users, Prosumers | Backoffice | Member 1 |
| Stations, Energy slots | Both; station activation is Backoffice only | Member 2 |
| Reservations | Both; approve, reject, modify, and cancel are Backoffice; schedule is Grid Operator | Member 3 |
| QR & transfers | Both; issue, verify, and complete are Grid Operator | Member 4 |
| Proposed contracts | Both | Shared API proposal |

The Android prosumer app is not part of this web console.

## Boundaries and initialization

UI checks improve the demonstration. The API remains authoritative for business rules and authorization. Do not add MongoDB access or server-side business logic here.

Proposed routes live in `src/services/contracts.js`. Confirm them with the team before treating them as final. Browser-delivered configuration must contain no secrets.

