# Frontend integration: implemented screens and remaining boundaries

The existing React and native Kotlin/AppCompat clients have been extended. C# services, QR security, MongoDB collections and lifecycle rules have not been changed. No operational demo records or local transfer completion are used.

## Implemented

- Native role dashboard and reservation counts/navigation; Requested, Approved, Scheduled and history lists.
- Native reservation search by status, text, date and station ID; detail, server history/actions, create, modify, cancel and booking review/summary.
- Native Prosumer QR display from server credentials; explicit reissue; in-memory retention across rotation.
- Native GridOperator camera QR scanning, server verification, operator confirmation and server completion summary.
- Camera permission handling, single-decode scanning, server errors, retries and unknown-completion handling.
- Separate client targets for the two API hosts, including QR issuance on the account host.
- Web reservation detail GET, history, server allowedActions/actionBlocks and real lifecycle mutations.
- Web completed transfer list using Completed reservations; transfer detail using real reservation information.
- Web operator QR JSON submission to the existing verification/completion POST operations.
- Web operational DataContext/seed/sessionStorage simulation removed; transfer routes restricted to staff roles.
- Existing login, registration, profile, accounts, Prosumer queues and station/slot interfaces retained.
- Android input setter compilation corrections and AppCompat theme parent correction preserve the existing colors and styling.

## API ownership and configuration

Account/QR host: backend/src, normally port 5000.
Reservation/catalog host: backend/SolarMicrogrid.API, normally port 5251.

Web .env.example:
- VITE_ACCOUNT_API_BASE_URL=/api
- VITE_RESERVATION_API_BASE_URL=/reservation-api
- VITE_DEV_API_PROXY_TARGET=http://localhost:5000
- VITE_DEV_RESERVATION_PROXY_TARGET=http://localhost:5251

Vite rewrites /reservation-api to /api on the reservation host. It sends /api directly to the account/QR host. The proxy prefix is a client development alias, not a new backend endpoint. Production bases must contain the actual deployed URL ending in /api.

The legacy VITE_API_BASE_URL is an account-base fallback; an explicit VITE_ACCOUNT_API_BASE_URL takes priority. Legacy VITE_API_URL still overrides the account-management helper. Prefer the new explicit base variables and remove stale local overrides.

Native BuildConfig.API_BASE_URL is the account/QR host. BuildConfig.RESERVATION_API_BASE_URL is the reservation host. Emulator defaults are http://10.0.2.2:5000 and http://10.0.2.2:5251; neither includes /api. Supply Gradle properties accountApiBaseUrl and reservationApiBaseUrl for a physical device/deployment.

The reservation host currently accepts X-User-Id and X-User-Role only in Development. Web uses that existing mechanism only under Vite development; Android sends those headers only in debug builds, using the identity returned by authenticated /auth/me. Both also send the JWT. Release/production requests send JWT only. This does not correct the host's missing JWT support; production reservation functionality remains blocked.

## Existing contracts used

Reservations:
- GET /api/reservations?status=&stationId=&date=&q=
- GET /api/reservations/{id}
- GET /api/reservations/options?prosumerId=
- POST /api/reservations with prosumerId, slotId, serviceType, energyKwh
- PATCH /api/reservations/{id} with slotId
- POST /api/reservations/{id}/cancel
- POST /api/reservations/{id}/approve
- POST /api/reservations/{id}/reject with reason
- POST /api/reservations/{id}/schedule
- GET /api/dashboard/reservations

QR (account host):
- POST /api/reservations/{id}/qr -> transactionId and qrPayload(version, reservationId, token)
- POST /api/transactions/verify with version, reservationId, token
- POST /api/transactions/{id}/complete with token, verificationToken

Transaction ID is the reservation ID. No transaction model/collection or transaction GET route was added. Reservation detail supplies names/windows; QR responses supply authoritative IDs, energy/status and completion audit. Only server responses determine success.

Persisted statuses remain Requested, Approved, Scheduled, Completed, Cancelled and Rejected. Pending labels mean Requested. QR token status is rendered only from verification/completion responses, never inferred from reservation status.

## Blocked backend integration: stop here before claiming end-to-end completion

| Capability | Existing conflict and files | Smallest backend correction |
| --- | --- | --- |
| Production reservation authentication | backend/SolarMicrogrid.API/Program.cs and Services/HeaderCurrentUser.cs do not authenticate JWT; backend/src/Program.cs does | Validate the same issuer/key/audience and implement ICurrentUser from validated claims. Preserve ReservationService |
| Real account user booking | backend/src/Models/User.cs uses configured UserDetails/account status; reservation Repositories/MongoProsumerLookup.cs reads Prosumers with different ID/status BSON representation | Adapt lookup to the authoritative account records with the exact JWT user ID and active-account semantics |
| QR on reservations created by the reservation host | backend/src/Models/EnergyReservation.cs maps lower-camel BSON fields; backend/SolarMicrogrid.API/Models/EnergyReservation.cs writes property-name BSON fields | Inspect actual persisted documents, choose one schema, align mappings/adapters and migrate existing documents if required; ensure both hosts use the same database |
| Reading/updating QR-bearing reservations | Reservation model does not accept qrTransfer; Repositories/MongoReservationRepository.cs replaces entire documents | Tolerate the shared schema and make conditional partial updates that preserve QR state and do not overwrite concurrent completion |
| Station/slot choices across hosts | backend/src/Models/SolarStationInfo.cs and EnergyBookingSlots.cs differ from reservation Repositories/MongoEnergyCatalog.cs documents | Choose an authoritative catalog and adapt reads; convert dates/times/capacity in C#, never by frontend guesses |
| Some valid modification choices | ReservationService.GetOptionsAsync excludes overlap against the current reservation and has no modification ID argument | Extend existing options contract with modification context, excluding that reservation; final validation remains ModifyAsync |
| Safe station deactivation/slot deletion | backend/src/Services/UnconfiguredStationReservationChecker.cs and UnconfiguredSlotReservationChecker.cs return unavailable | Implement actual reservation checks against aligned persistence; do not bypass fail-closed behavior |
| Station/slot write permissions | Account host station/slot controllers lack mutation authorization | Enforce Backoffice mutation access on the server |
| Persistent token history and completion audit | QrTransfersController has POST operations only; ReservationDto has no qrTransfer audit | Agree on a minimal authorized read projection over existing reservations that excludes credential hashes/raw tokens. No frontend GET /transactions calls until implemented |
| Completion in the general reservation timeline | MongoQrTransferRepository updates status/qrTransfer but not reservation History | Include server audit/history in the same atomic completion write if required |
| Time-based QR expiry | QrTransferService records issuance time but has no expiry field/check | Add an explicit server policy/contract only if the assignment requires expiry. UI does not invent an expiry countdown |
| Assigned operator bookings | OperationsController.GetOperationalBookings returns 501; no assignment field/contract exists | Use reservation search as implemented. An assigned queue requires an agreed server assignment capability |

These blockers are not hidden by UI fallbacks. Booking/issuance/verification failures display the real HTTP response. Do not seed alternative identities or duplicate reservations to make the two schemas appear compatible.

## Credential and lifecycle handling

- Issuance rotates QR credentials; the Android screen issues once on a new entry and only on explicit reissue afterward.
- QR payload/receipt stay in a ViewModel in memory across configuration changes. They are not put in saved instance state, preferences, Intent extras or logs.
- After process recreation, QR display requires explicit generation; scanner requires another scan.
- Credential-bearing Android windows disable screenshots.
- Scanner uses QR-only single decode, pauses camera before verification and disables Scan Again during API requests.
- Approved can be issued/verified, but completion requires Scheduled. Schedule first, then verify again.
- Changing Approved to Scheduled after verification invalidates the receipt fingerprint. The UI offers detail navigation and explicit reverification.
- Completion uses the response transactionId and both credentials. It does not change reservation state locally.
- HTTP 409 requires new verification/current data; no simulated success.
- Network/server failure during completion is an unknown outcome. Confirmation credentials are discarded and repeat completion is blocked in that screen until state is reviewed. A persistent audit read remains a backend dependency.
- HTTP errors support both reservation message bodies and QR ProblemDetails/validation bodies.

## Build and test commands

Web:
    cd web
    npm ci
    npm test
    npm run build
    npm run dev

Android:
    Open mobile in Android Studio; sync and run app.
    With Gradle 8.9 and Android SDK 35 installed:
    gradle :app:assembleDebug :app:lintDebug

Transport tests isolate fetch solely inside the test process, check host ownership, exact request bodies, encoded IDs, HTTP status/message handling and network/abort rejection. They do not supply sample records to operational screens or test server business rules.

## Manual test checklist

Validation performed in this workspace: web production build passed; seven Node test results passed (six transport subtests plus their parent); Android debug APK assembled and lint completed with zero errors and existing/dependency/resource warnings. No browser connection or attached Android device was available. Operational end-to-end transfer has not been verified and remains subject to the backend blockers above.

Use actual registered/activated accounts and real API-created bookings in a development/test database. First resolve the cross-host schema/account/catalog boundaries above.

- [ ] Run both hosts against the agreed database; configure the two client bases.
- [ ] Login as Prosumer; reopen the app with valid/expired JWT; confirm identity revalidation.
- [ ] Register and edit profile; verify these existing paths still work.
- [ ] Dashboard counts match reservation API responses; no empty/error screen is blank.
- [ ] Create a booking through server options and review; confirm server Requested response.
- [ ] Search/filter list; view details; verify history and actionBlocks.
- [ ] Modify/cancel an eligible booking; test server denial for notice/capacity/overlap/status.
- [ ] Backoffice approves/rejects via real APIs; Prosumers never see those controls.
- [ ] Operator schedules Approved reservation before scanning/final verification.
- [ ] Prosumer opens owned Approved/Scheduled booking QR; scan the displayed server payload.
- [ ] Rotate QR display during/after issuance; verify no extra issue call.
- [ ] Explicitly reissue; previous QR/verification receipt must fail server validation.
- [ ] Deny camera access; show visible recovery; grant access and scan again.
- [ ] Scan malformed JSON and unsupported version; never report local QR validity.
- [ ] Repeated camera frames produce one verification call; background/resume works.
- [ ] Verify as operator; show actual returned IDs, energy and statuses.
- [ ] Complete once; show server completion time/operator and Completed/Used.
- [ ] Refresh reservation/list; Completed state comes from the API.
- [ ] Try another operator, duplicate confirmation, cancelled booking, changed reservation and used token; show failures.
- [ ] Disconnect during completion; show unknown outcome, never automatic success/retry.
- [ ] Web list opens real reservation detail; reload direct URL successfully.
- [ ] Web modify/cancel/approve/reject/schedule respects server allowedActions and errors.
- [ ] Web completed list contains only actual Completed reservations; no token codes fabricated.
- [ ] Operator web QR JSON verifies/completes through account host; Backoffice has oversight only.
- [ ] Direct Prosumer navigation to transfers is rejected by the route guard.
- [ ] Existing station/slot/accounts/activation interfaces continue to call their original owners.
- [ ] Test loading, empty, 400, 401, 403, 404, 409, 5xx, network and camera failure states.
- [ ] Confirm production clients do not send development identity headers.

A camera-capable device/emulator, real accounts and aligned backend contracts are required for the final end-to-end check. Build/transport checks alone do not prove an energy transfer was completed.
