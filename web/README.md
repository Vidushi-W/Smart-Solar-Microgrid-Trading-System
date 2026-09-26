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

## Boundaries and initialization

UI validation improves usability; the API remains authoritative for business rules and authorization. Do not add MongoDB access or server-side business logic here.

Choose React tooling and dependency versions before generating the project in this directory. Configure the API base URL and document commands during initialization. Browser-delivered configuration must contain no secrets.

No package manifest, dependency installation or runnable React code is included yet.

