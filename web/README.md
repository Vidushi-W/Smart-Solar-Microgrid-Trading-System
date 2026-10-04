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

Start MongoDB and the backend first. From the `web` directory, create the local API configuration and start Vite:

```bash
cp .env.example .env
npm install
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` for the first command. Run the backend with `dotnet run --project backend/src/SmartSolar.Microgrid.Api.csproj --urls http://localhost:5000` from the repository root.

Open http://localhost:5173 and choose Sign in. The form sends a username or NIC and a password to `POST /api/auth/login`. The account must already exist in MongoDB and be active. This repository does not seed a web username or password.

Vite proxies `/api` to `VITE_DEV_API_PROXY_TARGET` when `VITE_API_BASE_URL` is `/api`. The checked-in example points that proxy at `http://localhost:5000`. Copy `.env.example` to `.env` before starting the console.

Stations and slot management actions are shown only to the Backoffice role. Deactivation and deletion can return 503 until the reservation checker is connected.

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
| Stations | Both can view; add, edit, slot management, and deactivate are Backoffice only | Member 2 |
| Station slot manager | Backoffice | Member 2 |
| Reservations | Both; approve, reject, modify, and cancel are Backoffice; schedule is Grid Operator | Member 3 |
| QR & transfers | Both; issue, verify, and complete are Grid Operator | Member 4 |
| Proposed contracts | Both | Shared API proposal |

The Android prosumer app is not part of this web console.

## Boundaries and initialization

UI checks improve the demonstration. The API remains authoritative for business rules and authorization. Do not add MongoDB access or server-side business logic here.

The current station and slot routes are listed in `src/services/contracts.js`. Browser-delivered configuration must contain no secrets.

