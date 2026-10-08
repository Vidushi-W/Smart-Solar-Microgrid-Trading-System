# Temporary inserter. Deletes itself after a successful run is not required;
# the caller removes this file. Only inserts // lines.
from pathlib import Path

ROOT = Path(r"c:\Users\geeth\OneDrive\Documents\GitHub\Smart-Solar-Microgrid-Trading-System\mobile\app\src\main\java")

# path relative to ROOT -> list of (exact existing line, comment lines to insert above it)
EDITS = {
"com/smartsolar/microgrid/activities/StaffProfileActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Grid operator and backoffice profile.",
"// Loads and saves /api/users/me/profile. Username and role stay read-only.",
"// The session lives in authentication_session; logout also clears the SQLite account.",
]),
("    override fun onCreate(savedInstanceState: Bundle?) {", [
"    // GridOperator and Backoffice only. Any other role closes the screen. A missing token returns to login.",
]),
("    private fun showAvatar(data: String?) {", [
"    // Blank data shows the letter avatar. A data URL is decoded as a JPEG and shown instead.",
]),
("    private fun showError(error: Exception) {", [
"    // Signs out when the message mentions 401, expiry, or an inactive account.",
]),
("    private fun isPhoneValid(value: String): Boolean {", [
"    // Optional leading plus and punctuation, with 7 to 15 digits.",
]),
("    private fun isStrongPassword(value: String): Boolean =", [
"    // Eight or more characters, with upper, lower, a digit, and a symbol.",
]),
],
"com/smartsolar/microgrid/api/MicrogridApi.kt": [
("package com.smartsolar.microgrid.api", [
"// Authenticated client for reservation lists and QR transfers.",
"// Reservation calls use RESERVATION_API_BASE_URL. QR issue, verify, and complete use API_BASE_URL.",
"// The JWT comes from authentication_session. Debug builds also send X-User-Id and X-User-Role.",
]),
("    private fun request(base: String, path: String, method: String = \"GET\", body: JSONObject? = null,", [
"    // Bearer JSON call. A dead connection becomes status 0 because the outcome may be unknown.",
]),
("    private fun reservation(path: String, method: String = \"GET\", body: JSONObject? = null): Any =", [
"    // Reservation host. Debug builds attach the user from GET /api/auth/me.",
]),
("        fun encode(value: String): String = java.net.URLEncoder.encode(value, \"UTF-8\").replace(\"+\", \"%20\")", [
"        // URL-encodes and turns spaces into %20.",
]),
],
"com/smartsolar/microgrid/authentication/ProsumerRegistrationResponse.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Response from POST /api/prosumers/register: message, NIC, and account status.",
]),
],
"com/smartsolar/microgrid/authentication/LocalAccountStore.kt": [
("    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {", [
"    // Drops the local account table and creates it again.",
]),
("    fun save(user: AuthenticatedUser) {", [
"    // Keeps a single row, using the user id as the key when NIC is blank.",
]),
("    fun save(profile: ProsumerProfile) {", [
"    // Saves the prosumer with role PROSUMER and the NIC as the username.",
]),
("    fun current(): MobileAccountProfile? {", [
"    // Reads the one stored row. createdAtUtc here is the local updated_at, not the server registration time.",
]),
("    private fun write(", [
"    // Deletes every row, then inserts the current account with an updated timestamp.",
]),
],
"com/smartsolar/microgrid/authentication/RegisterProsumerRequest.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Body for POST /api/prosumers/register. This type is not written to local storage.",
]),
],
"com/smartsolar/microgrid/activities/MainActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Sign-in screen. Posts /api/auth/login, then checks /api/auth/me.",
"// Backoffice is rejected on mobile. A matching session is stored in authentication_session and copied to SQLite.",
]),
("    private fun submitLogin() {", [
"    // Blocks Backoffice, requires the login role to match /api/auth/me, and stores that user in SQLite.",
]),
("    private fun validateSavedSession(token: String, savedRole: String) {", [
"    // Drops the saved session when the token is rejected or the account is inactive.",
]),
],
"com/smartsolar/microgrid/activities/CreateReservationActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Prosumer booking flow: active stations, a Colombo date, open slots, then confirm.",
"// Creates through the reservation API. The date picker spans 30 days, but a day past 7 is rejected.",
]),
("    private fun loadStations() {", [
"    // Loads the signed-in user and keeps stations whose status is Active.",
]),
("    private fun showDate() {", [
"    // Picker range is 30 days, but a day past the next 7 is reset to today and a notice is shown.",
]),
("    private fun confirm(slot: SlotRecord) {", [
"    // Stops when the slot has started or is outside the 7-day window, then creates the reservation and reloads it.",
]),
("    private fun showError(error: Exception) {", [
"    // Rule failures use a notice popup. Any other error is written on the screen.",
]),
("    private fun token(): String? {", [
"    // Returns the session JWT, or closes this screen when it is missing.",
]),
],
"com/smartsolar/microgrid/ui/SolarActivity.kt": [
("package com.smartsolar.microgrid.ui", [
"// Shared shell for the operational reservation and QR screens.",
"// setup() requires a JWT and an allowed role, otherwise it returns to login.",
]),
("    fun request(work: () -> Any) {", [
"    // Ignores a new call while an earlier request is still running.",
]),
("    protected fun setup(title: String, roles: List<String> = listOf(\"Prosumer\", \"GridOperator\", \"Backoffice\")): Boolean {", [
"    // Sends the user to login when the token is missing or the saved role is not allowed.",
]),
("    protected fun report(busy: Boolean, error: Exception?) {", [
"    // A 401 shows a sign-in button that clears the session prefs and the SQLite account.",
]),
("    protected fun failureText(error: Exception): String {", [
"    // Adds a label for status 0, 400, 401, 403, 404, and 409 before the server message.",
]),
("    protected fun back() {", [
"    // Inserts the back bar as the first child only when that control is not already there.",
]),
("        fun date(value: String): String = try {", [
"        // Formats the instant in Asia/Colombo, or returns the original text if it is not an instant.",
]),
],
"com/smartsolar/microgrid/authentication/UpdateProsumerProfileRequest.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Body for PUT /api/prosumers/me/profile, including an optional JPEG data URL.",
]),
],
"com/smartsolar/microgrid/authentication/AuthenticatedUser.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Identity returned by GET /api/auth/me and copied into the local account store.",
]),
],
"com/smartsolar/microgrid/authentication/LoginRouter.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Maps each UserRole to a home destination. MainActivity still refuses Backoffice before opening home.",
]),
],
"com/smartsolar/microgrid/authentication/MobileAccountProfile.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Profile fields shared by staff and prosumer account responses, plus an optional photo data URL.",
]),
],
"com/smartsolar/microgrid/activities/RoleHomeActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Home for Prosumer and GridOperator. Any other saved role is sent back to login.",
"// On start it refreshes /api/auth/me and reservation counts. SQLite is shown before the API profile arrives.",
]),
("    override fun onCreate(savedInstanceState: Bundle?) {", [
"    // Allows only Prosumer and GridOperator, and shows the SQLite profile before the network refresh.",
]),
("    private fun validateSession() {", [
"    // Reloads identity, profile, and booking counts. Signs out on 401, expiry, or an inactive account.",
]),
("    private fun showProfile(profile: MobileAccountProfile) {", [
"    // Shows a JPEG data URL when present, otherwise the first letter of the name.",
]),
("    private fun loadBookings(token: String): HomeBookings {", [
"    // Prosumer counts are upcoming, completed, cancelled, and this week. Operator counts are pending, approved, completed, and cancelled.",
]),
("    private fun weekCount(rows: List<ReservationRecord>): Int {", [
"    // Counts rows whose UTC date falls between Monday and Sunday of the current UTC week.",
]),
("    private fun bookingCard(row: ReservationRecord, stations: List<StationRecord>): View {", [
"    // Prosumer cards for Approved or Scheduled include a button that opens the QR.",
]),
],
"com/smartsolar/microgrid/models/ReservationModels.kt": [
("package com.smartsolar.microgrid.models", [
"// Station, slot, and reservation rows parsed from the account API.",
]),
("fun stationLabel(station: StationRecord?): String {", [
"// Prefers the API name, then a fixed name for a few known station ids.",
]),
("fun utcDate(iso: String): String = iso.take(10)", [
"// The first 10 characters of the ISO value.",
]),
("fun utcTime(iso: String): String =", [
"// HH:mm taken from index 11, or empty when the string is shorter than 16 characters.",
]),
],
"com/smartsolar/microgrid/qr/QrWorkflowModel.kt": [
("    fun verify(api: MicrogridApi, raw: String) {", [
"    // Rejects a code that fails local parsing and does not call the API.",
]),
("    fun complete(api: MicrogridApi) {", [
"    // Posts the in-memory QR token and the verification receipt from the last check.",
]),
("    private fun run(completion: Boolean, work: () -> QrState) {", [
"    // A failed completion clears the token. It is uncertain for no status, status 0, 2xx, or 5xx, and certain for other HTTP statuses.",
]),
],
"com/smartsolar/microgrid/stations/StationsApiClient.kt": [
("package com.smartsolar.microgrid.stations", [
"// GET /api/stations with the caller's bearer token.",
]),
("    fun list(token: String): List<Station> {", [
"    // Skips rows whose latitude or longitude is missing or out of range.",
]),
],
"com/smartsolar/microgrid/activities/ProsumerProfileActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Prosumer profile. Loads and updates /api/prosumers/me/profile and can request deactivation.",
"// Shows the SQLite account first. Logout clears the session prefs and that local row.",
]),
("    private fun showAvatar(data: String?) {", [
"    // Blank data shows the letter avatar. A data URL is decoded as a JPEG and shown instead.",
]),
("    private fun showCachedAccount() {", [
"    // Fills the form from SQLite while the profile request is still running.",
]),
("    private fun setEditing(value: Boolean) {", [
"    // Enables the photo and text fields. NIC, status, and registration date stay read-only.",
]),
("    private fun requestDeactivation() {", [
"    // Posts deactivation, then saves the returned status into SQLite.",
]),
("    private fun handleApiError(error: Exception) {", [
"    // Signs out on 401, an expired token, or an inactive account.",
]),
("    private fun isPhoneValid(value: String): Boolean {", [
"    // Optional leading plus and punctuation, with 7 to 15 digits.",
]),
],
"com/smartsolar/microgrid/activities/ModifyReservationActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Prosumer slot change for one reservation. The station stays the same.",
"// Both the current start and the new slot need 12 hours' notice. A date past 7 Colombo days is rejected.",
]),
("    private fun load() {", [
"    // Loads the reservation and warns when it is inside the 12-hour window.",
]),
("    private fun showDate() {", [
"    // Picker range is 30 days, but a day past the next 7 is reset to today and a notice is shown.",
]),
("    private fun canChangeTo(slot: SlotRecord): Boolean {", [
"    // Requires 12 hours' notice for both the current start and the selected slot.",
]),
("    private fun submit(slot: SlotRecord) {", [
"    // Sends the new slot with the reservation's current status, then reloads the saved row.",
]),
("    private fun showError(error: Exception) {", [
"    // Rule failures use a notice popup. Any other error is written on the screen.",
]),
("    private fun token(): String? {", [
"    // Returns the session JWT, or closes this screen when it is missing.",
]),
],
"com/smartsolar/microgrid/activities/QrScanActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Grid-operator camera scan for a version-1 transfer QR.",
"// Verifies with POST /api/transactions/verify, then completes using the returned verification token.",
]),
("    private fun startCamera() {", [
"    // Keeps the first accepted code and ignores later frames until the scan is reset.",
]),
("    private fun onScanned(raw: String) {", [
"    // Accepts only version 1 with a reservation id and token, then calls verify.",
]),
("    private fun complete() {", [
"    // Completes the transfer with the QR token and the verification token from verify.",
]),
("    private fun token(): String? {", [
"    // Returns the session JWT, or closes this screen when it is missing.",
]),
],
"com/smartsolar/microgrid/authentication/UserRole.kt": [
("package com.smartsolar.microgrid.authentication", [
"// App roles. The API spells them Prosumer, GridOperator, and Backoffice.",
]),
],
"com/smartsolar/microgrid/activities/ModulePlaceholderActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Placeholder for a module that is not connected yet.",
"// Logout clears authentication_session and the local SQLite account.",
]),
],
"com/smartsolar/microgrid/authentication/LoginResponse.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Successful POST /api/auth/login. MainActivity stores the token; this type does not.",
]),
],
"com/smartsolar/microgrid/activities/ReservationListActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Lists the signed-in user's bookings, or every booking in staff mode.",
"// Upcoming keeps Pending, Approved, and Scheduled. History keeps Completed and Cancelled.",
]),
("    private fun load(mode: String) {", [
"    // Staff mode loads every reservation. Other modes load only the signed-in user's.",
]),
("    private fun render(mode: String) {", [
"    // Upcoming is Pending, Approved, and Scheduled. History is Completed and Cancelled. Staff shows every status.",
]),
("    private fun token(): String? {", [
"    // Returns the session JWT, or closes this screen when it is missing.",
]),
],
"com/smartsolar/microgrid/activities/ReservationDetailActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// One reservation from the account API.",
"// Any role can show a transfer QR for Approved or Scheduled. Only a prosumer can modify or cancel, and only with 12 hours' notice.",
]),
("    private fun load() {", [
"    // Reloads on resume. A one-time show-QR extra opens the code for an Approved or Scheduled booking.",
]),
("    private fun show(row: ReservationRecord) {", [
"    // QR is offered for Approved or Scheduled. Modify and cancel are prosumer-only and need 12 hours' notice.",
]),
("    private fun hasNotice(row: ReservationRecord): Boolean {", [
"    // Returns false and shows the 12-hour notice when the start is too soon.",
]),
("    private fun loadQr(row: ReservationRecord) {", [
"    // Reuses a payload already issued for this reservation; otherwise posts for a new QR and draws it.",
]),
("    private fun showError(error: Exception) {", [
"    // Rule failures use a notice popup. Any other error is written on the screen.",
]),
("    private fun token(): String? {", [
"    // Returns the session JWT, or closes this screen when it is missing.",
]),
],
"com/smartsolar/microgrid/reservations/BookingRules.kt": [
("    fun epochMillis(date: LocalDate): Long =", [
"    // Start of that date at the fixed +05:30 offset, in epoch millis.",
]),
("    fun slotInstant(date: String, startTime: String): String =", [
"    // Builds yyyy-MM-ddTHH:mm:00.000Z from the first 10 date characters and first 5 time characters.",
]),
("    fun hasTwelveHourNotice(iso: String, now: Instant = Instant.now()): Boolean {", [
"    // False when the time cannot be parsed or the start is earlier than 12 hours from now.",
]),
("    fun slotWindow(date: String, startTime: String, now: Instant = Instant.now()): SlotWindow {", [
"    // Started when the slot is not still in the future. Beyond seven days after 23:59:59 on today plus 7 at +05:30.",
]),
("    fun bookable(slot: SlotRecord, now: Instant = Instant.now()): Boolean {", [
"    // False for Closed, Full, or no remaining capacity, and unless the slot window is Ok.",
]),
("    private fun parseUtc(iso: String): Instant? {", [
"    // Returns null when shorter than 16 characters. If there is no Z or plus offset, appends Z.",
]),
("fun Activity.noticeForApi(message: String?): Boolean {", [
"// Shows the 12-hour, 7-day, or already-started notice when the API message mentions that rule.",
]),
],
"com/smartsolar/microgrid/authentication/AuthenticationApiClient.kt": [
("package com.smartsolar.microgrid.authentication", [
"// HTTP client for login, registration, and profile calls on the account API.",
"// Prosumer profiles use /api/prosumers/me. Staff profiles use /api/users/me/profile.",
]),
("    fun getCurrentUser(token: String): AuthenticatedUser {", [
"    // GET /api/auth/me. Failures include the HTTP status so screens can recognize 401.",
]),
("    fun getMyProsumerAccount(token: String): MobileAccountProfile =", [
"    // Same profile endpoint as getMyProfile, mapped into the shared account shape used by the home screen.",
]),
("    private fun parseAccountProfile(response: JSONObject) = MobileAccountProfile(", [
"    // Uses accountStatus when present, otherwise derives Active or Inactive from isActive.",
]),
("    fun updateMyStaffProfile(", [
"    // PUT /api/users/me/profile for staff. A Prosumer role is rejected before the call.",
]),
("    fun requestDeactivation(token: String): String {", [
"    // POST /api/prosumers/me/deactivation and returns the new status, or DeactivationRequested.",
]),
("    private fun authorizedRequest(", [
"    // Bearer call whose error text starts with the HTTP status code.",
]),
("    private fun parseRole(value: String): UserRole = when (value) {", [
"    // Maps the three API role names and rejects anything else.",
]),
],
"com/smartsolar/microgrid/activities/ReservationQrActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Prosumer screen that draws a transfer QR from QrWorkflowModel.",
"// FLAG_SECURE blocks screenshots. Issuance goes through MicrogridApi.",
]),
("    override fun onCreate(savedInstanceState: Bundle?) {", [
"    // Prosumer only, and screenshots are blocked.",
]),
],
"com/smartsolar/microgrid/activities/RegisterProsumerActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Public sign-up through POST /api/prosumers/register. This screen does not sign the user in.",
"// NIC must be 12 digits or 9 digits plus V or X. PendingActivation shows the waiting message.",
]),
("    private fun submitRegistration() {", [
"    // Checks NIC, email, phone, and password locally, then registers without starting a session.",
]),
("    private fun isStrongPassword(password: String): Boolean =", [
"    // Eight or more characters, with upper, lower, a digit, and a symbol.",
]),
],
"com/smartsolar/microgrid/activities/ReservationFormActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Prosumer form to create a reservation or change its slot through MicrogridApi.",
]),
("    override fun onCreate(savedInstanceState: Bundle?) {", [
"    // Prosumer only. Modify hides service and energy; the prosumer spinner stays locked unless the role is Backoffice.",
]),
("    private fun loadChoices(person: String = \"\") {", [
"    // Loads options for the reservation's prosumer, the signed-in prosumer, or the id passed in.",
]),
("    private fun review() {", [
"    // Create posts prosumer, slot, service, and energy. Modify posts only the new slot id.",
]),
],
"com/smartsolar/microgrid/activities/OperationalReservationDetailActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Operational reservation detail. Buttons follow the role and stay disabled unless the server allow-list includes them.",
"// Grid operators schedule, backoffice approves or rejects, and prosumers modify or cancel.",
]),
("    override fun onCreate(savedInstanceState: Bundle?) {", [
"    // Grid operators schedule, backoffice approves or rejects, and prosumers modify or cancel when the server allows it.",
]),
("    override fun onResume() { super.onResume(); if (::id.isInitialized) load() }", [
"    // Reloads the reservation each time the screen is shown.",
]),
],
"com/smartsolar/microgrid/authentication/LoginRequest.kt": [
("package com.smartsolar.microgrid.authentication", [
"// POST /api/auth/login body. identifier is a username or NIC.",
]),
],
"com/smartsolar/microgrid/activities/QrScannerActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Grid-operator scanner. Screenshots are blocked.",
"// Confirm is enabled only for a Scheduled reservation that still has a verification token.",
]),
("    override fun onCreate(savedInstanceState: Bundle?) {", [
"    // Grid operator only. Screenshots are blocked.",
]),
("    private fun scan() {", [
"    // Does nothing while a request is in flight or the last completion outcome is uncertain.",
]),
],
"com/smartsolar/microgrid/authentication/ProsumerProfile.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Prosumer profile from GET /api/prosumers/me/profile, including an optional JPEG data URL.",
]),
],
"com/smartsolar/microgrid/ui/SolarUi.kt": [
("package com.smartsolar.microgrid.ui", [
"// Shared back bar, buttons, fact rows, status chips, choice cards, and confirmation popups.",
]),
("    fun statusChip(context: android.content.Context, status: String) = TextView(context).apply {", [
"    // Green for approved, completed, and scheduled; amber for pending and requested; red for cancelled and rejected.",
]),
],
"com/smartsolar/microgrid/activities/StationMapActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Map of Active stations from GET /api/stations for a signed-in user.",
"// Google Maps is used when a maps key exists; otherwise a local drawing is shown. The demo token loads nothing.",
]),
("    override fun onCreate(savedInstanceState: Bundle?) {", [
"    // Uses Google Maps when a key is set; otherwise shows the drawn stand-in and asks for location.",
]),
("    private fun loadStations() {", [
"    // Skips the network when the token is missing or is the local demo token.",
]),
("    private fun displayStationsOnMap() {", [
"    // Drops out-of-range coordinates, then frames one station or the whole set.",
]),
("        override fun onDraw(canvas: Canvas) {", [
"        // Draws stations by stretching their coordinates across the view.",
]),
("        override fun onTouchEvent(event: MotionEvent): Boolean {", [
"        // Opens the station whose marker is nearest to the tap.",
]),
],
"com/smartsolar/microgrid/stations/Station.kt": [
("package com.smartsolar.microgrid.stations", [
"// One station from GET /api/stations, with coordinates, battery slots, hours, and status.",
]),
],
"com/smartsolar/microgrid/api/QrApiClient.kt": [
("package com.smartsolar.microgrid.api", [
"// Verify and complete a scanned transfer QR on the account API.",
"// complete posts the QR token and verification token to /api/transactions/{reservationId}/complete.",
]),
("    private fun messageOf(body: String, code: Int): String {", [
"    // Uses message, then detail, then title from an error body.",
]),
],
"com/smartsolar/microgrid/authentication/ProfilePictureCodec.kt": [
("package com.smartsolar.microgrid.authentication", [
"// Builds a JPEG data URL for profile updates.",
"// Shrinks the image until the JPEG is at most 750 KB.",
]),
("    fun encodeJpeg(contentResolver: ContentResolver, uri: Uri): String {", [
"    // Subsamples so the longer side is at most 1024 px, then compresses.",
]),
("    private fun encodeResized(source: Bitmap): String {", [
"    // Scales toward 512 px and retries JPEG qualities until the byte cap is met.",
]),
],
"com/smartsolar/microgrid/activities/ReservationsActivity.kt": [
("package com.smartsolar.microgrid.activities", [
"// Operational reservation list filtered by status, text, date, and station.",
"// Prosumers get a create button. A row opens the operational detail screen.",
]),
("    private fun load() {", [
"    // Reads the spinner and the three fields, then calls the reservation list API.",
]),
],
"com/smartsolar/microgrid/api/ReservationApiClient.kt": [
("    fun update(", [
"    // PUT includes the new slot time and the status the reservation already has.",
]),
("    fun issueQr(token: String, id: String): String {", [
"    // Returns the qrPayload object as text, accepting either JSON name casing.",
]),
("    private fun messageOf(body: String, code: Int): String {", [
"    // Uses message, then detail, then title from an error body.",
]),
],
}


def apply(path: Path, edits):
    raw = path.read_bytes()
    newline = "\r\n" if b"\r\n" in raw else "\n"
    text = raw.decode("utf-8")
    ended = text.endswith("\n")
    lines = text.splitlines()
    original = list(lines)
    inserts = {}
    for exact, comments in edits:
        idxs = [i for i, line in enumerate(lines) if line == exact]
        if len(idxs) != 1:
            raise SystemExit(f"{path}: expected 1 match for {exact!r}, found {len(idxs)}")
        if idxs[0] in inserts:
            raise SystemExit(f"{path}: two inserts at line {idxs[0] + 1}")
        for comment in comments:
            stripped = comment.lstrip()
            if not stripped.startswith("//"):
                raise SystemExit(f"non-comment: {comment!r}")
        inserts[idxs[0]] = comments
    for index in sorted(inserts, reverse=True):
        lines[index:index] = inserts[index]
    # Every original line remains, in order, and every extra line is a comment.
    cursor = 0
    for line in lines:
        if cursor < len(original) and line == original[cursor]:
            cursor += 1
        elif not line.lstrip().startswith("//"):
            raise SystemExit(f"{path}: unexpected new line {line!r}")
    if cursor != len(original):
        raise SystemExit(f"{path}: lost original lines")
    new = newline.join(lines)
    if ended:
        new += newline
    path.write_bytes(new.encode("utf-8"))
    return len(lines) - len(original)


def main():
    total = 0
    files = []
    for rel, edits in EDITS.items():
        path = ROOT / rel
        if not path.is_file():
            raise SystemExit(f"missing {path}")
        added = apply(path, edits)
        total += added
        files.append((rel, added))
    print(f"files {len(files)} comment_lines {total}")
    for rel, added in files:
        print(f"{added:3} {rel}")


if __name__ == "__main__":
    main()
