# Collaboration Workflow

This scaffold is prepared for the repository owner's manual first commit and push. No commit or push is performed as part of scaffold generation.

After that first push, each of the other three team members can clone the repository and develop on separate feature branches.

## Feature workflow

1. Clone the repository and start from the team's agreed base branch.
2. Create a focused branch, for example `feature/backend-auth`, `feature/web-dashboard` or `feature/android-reservations`.
3. Coordinate shared API contracts and files with teammates before editing.
4. Implement the feature, run the relevant checks and update documentation.
5. Commit and push the feature branch, then open a pull request.
6. Review and merge through the team's agreed process.

Do not commit dependencies, generated build outputs, credentials or machine-specific configuration. Commit application dependency lockfiles and the Gradle wrapper when the actual projects are initialized.

## Review checklist

- Does central business logic and authorization remain in the API?
- Do client/server interactions use REST?
- Is MongoDB confined to the backend and SQLite to Android local persistence?
- Does the mobile application remain native Android?
- Are changes to shared API contracts documented?
- Are verification results and setup changes described?

