# Smart Solar Microgrid Trading System

Initial repository scaffold for a four-member team building a solar microgrid energy trading system.

## Applications

| Directory | Technology | Users / responsibility |
| --- | --- | --- |
| `backend/` | C#, ASP.NET Core Web API, MongoDB; deployment to IIS | REST API and central business logic |
| `web/` | React, responsive UI | Backoffice and Grid Operator interfaces |
| `mobile/` | Pure native Android, Kotlin or Java, local SQLite | Solar Prosumer and Grid Operator interfaces |
| `docs/` | Project documentation | Architecture, feature scope, collaboration |
| `scripts/` | Future development automation | Setup, checks and deployment helpers |

## Current status

This is a directory-and-documentation scaffold only. No application implementation, dependency manifests, generated framework projects, database connections, or build tooling are included yet. There are no runnable applications or automated tests at this stage.

Empty directories contain `.gitkeep` placeholders so Git preserves the complete structure. Remove a placeholder when real files occupy its directory.

## Architecture rules

- Both clients communicate with the backend exclusively through REST API calls.
- The API uses FAT Services: central business rules belong in backend services; controllers handle HTTP concerns and repositories handle persistence.
- MongoDB is the central server-side database and is accessed only by the backend.
- SQLite is for required local persistence on Android; it is not the central database.
- Mobile must remain pure native Android. Flutter and React Native are excluded.
- Authorization and authoritative validation must be enforced in the API.

## Starting development

1. Review the application READMEs and [architecture](docs/architecture.md).
2. Agree on framework versions, API contracts and ownership before generating projects.
3. Initialize the ASP.NET Core project within `backend/src/`, React within `web/`, and a native Android project within `mobile/`, preserving the documented folders.
4. Add real tests in each application's test directory as functionality is implemented.
5. Follow the [collaboration workflow](docs/contributing.md).

The repository owner will review this scaffold and perform the first commit and push manually.

