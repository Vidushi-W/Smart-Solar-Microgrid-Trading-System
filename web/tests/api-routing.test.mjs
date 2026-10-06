// Isolated transport tests only. No test response is used by the application.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { bookingDateRange, isSlotWithinBookingWindow, slotBookingState } from "../src/pages/reservations/reservationTime.js";

test("booking picker matches the API's seven Colombo calendar days", () => {
  const now = Date.parse("2026-10-06T20:30:00.000Z");
  assert.deepEqual(bookingDateRange(now), { minDate: "2026-10-07", maxDate: "2026-10-14" });
  assert.equal(isSlotWithinBookingWindow({ date: "2026-10-06", startTime: "20:29" }, now), false);
  assert.equal(isSlotWithinBookingWindow({ date: "2026-10-06", startTime: "20:30" }, now), false);
  assert.equal(isSlotWithinBookingWindow({ date: "2026-10-06", startTime: "20:31" }, now), true);
  assert.equal(isSlotWithinBookingWindow({ date: "2026-10-13", startTime: "20:30" }, now), true);
  assert.equal(isSlotWithinBookingWindow({ date: "2026-10-13", startTime: "20:31" }, now), true);
  assert.equal(isSlotWithinBookingWindow({ date: "2026-10-14", startTime: "09:00" }, now), true);
  assert.equal(isSlotWithinBookingWindow({ date: "2026-10-14", startTime: "18:29" }, now), true);
  assert.equal(isSlotWithinBookingWindow({ date: "2026-10-14", startTime: "18:30" }, now), false);
  assert.equal(slotBookingState({ date: "2026-10-14", startTime: "18:30" }, new Date(now)).reason, "Outside the next 7 days");
  assert.deepEqual(bookingDateRange(Date.parse("2026-10-31T20:30:00Z")), { minDate: "2026-11-01", maxDate: "2026-11-08" });
  assert.equal(isSlotWithinBookingWindow(null, now), false);
  assert.equal(isSlotWithinBookingWindow({ date: "invalid", startTime: "invalid" }, now), false);
});

test("existing API ownership, bodies and errors", async (t) => {
  const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const requests = [];
  globalThis.localStorage = { getItem: () => "transport-test-only" };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json({});
  };
  try {
    const reservations = await server.ssrLoadModule("/src/services/reservationsApi.js");
    const qr = await server.ssrLoadModule("/src/services/qrTransfersApi.js");
    const catalog = await server.ssrLoadModule("/src/services/catalogApi.js");
    const targets = await server.ssrLoadModule("/src/services/apiTargets.js");
    const accountBookings = await server.ssrLoadModule("/src/services/apiClient.js");
    const user = { id: "transport-test-only", role: "Prosumer" };

    await t.test("reservation reads use reservation host and encoded identifiers", async () => {
      await reservations.fetchReservation(user, "id /&");
      const { url, options } = requests.pop();
      assert.equal(url, targets.RESERVATION_API_BASE + "/reservations/id%20%2F%26");
      assert.equal(options.headers.get("Authorization"), "Bearer transport-test-only");
      assert.equal(options.headers.get("X-User-Id"), user.id);
      assert.equal(options.headers.get("X-User-Role"), user.role);
    });
    await t.test("QR issuance stays on account host despite reservation-shaped route", async () => {
      await qr.issueQr("id /&");
      const { url, options } = requests.pop();
      assert.equal(url, targets.ACCOUNT_API_BASE + "/reservations/id%20%2F%26/qr");
      assert.equal(options.method, "POST");
      assert.equal(options.headers.has("X-User-Role"), false);
      assert.equal(options.body, undefined);
    });
    await t.test("verification and completion send only existing credential contracts", async () => {
      const payload = { version: 2, reservationId: "transport-test-only", token: "deliberately-invalid" };
      await qr.verifyQr(payload);
      let request = requests.pop();
      assert.equal(request.url, targets.ACCOUNT_API_BASE + "/transactions/verify");
      assert.deepEqual(JSON.parse(request.options.body), payload);
      const credentials = { token: "deliberately-invalid", verificationToken: "deliberately-invalid" };
      await qr.completeTransfer(payload.reservationId, credentials);
      request = requests.pop();
      assert.equal(request.url, targets.ACCOUNT_API_BASE + "/transactions/transport-test-only/complete");
      assert.equal(request.options.method, "POST");
      assert.deepEqual(JSON.parse(request.options.body), credentials);
    });
    await t.test("modify uses PATCH with slotId and nearby uses reservation contract", async () => {
      await reservations.modifyReservation(user, "transport-test-only", "slot-test-only");
      let request = requests.pop();
      assert.equal(request.options.method, "PATCH");
      assert.deepEqual(JSON.parse(request.options.body), { slotId: "slot-test-only" });
      await catalog.fetchNearbyStations(user, 6.9, 79.8, 25);
      request = requests.pop();
      assert.equal(request.url, targets.RESERVATION_API_BASE + "/stations/nearby?latitude=6.9&longitude=79.8&radiusKm=25");
    });
    await t.test("HTTP errors retain status and server ProblemDetails/validation", async () => {
      globalThis.fetch = async () => Response.json({ title: "Verify the current reservation again." }, { status: 409 });
      await assert.rejects(() => qr.verifyQr({}), (error) => error.status === 409 && error.message.includes("Verify"));
      globalThis.fetch = async () => Response.json({ errors: { SlotId: ["Select a slot."] } }, { status: 400 });
      await assert.rejects(() => reservations.modifyReservation(user, "id", ""), (error) => error.status === 400 && error.message === "Select a slot.");
      globalThis.fetch = async () => Response.json({ message: "Sign in is required." }, { status: 401 });
      await assert.rejects(() => reservations.fetchReservation(user, "id"), (error) => error.status === 401);
    });
    await t.test("account booking confirmation returns the created reservation on the account host", async () => {
      const saved = { reservationId: "booking-test-only", status: "Pending" };
      globalThis.fetch = async (url, options) => {
        requests.push({ url, options });
        return Response.json(saved);
      };
      const booking = { prosumerId: user.id, stationId: "station-test-only", slotId: "slot-test-only", scheduledAtUtc: "2030-01-01T09:00:00.000Z" };
      assert.deepEqual(await accountBookings.createReservation(booking), saved);
      const request = requests.pop();
      assert.equal(request.url, targets.ACCOUNT_API_BASE + "/reservations");
      assert.equal(request.options.method, "POST");
      assert.deepEqual(JSON.parse(request.options.body), booking);
      assert.ok(request.options.signal instanceof AbortSignal);
    });
    await t.test("slow booking confirmation stops waiting and warns against duplicate submission", async (bookingTest) => {
      bookingTest.mock.timers.enable({ apis: ["setTimeout"] });
      globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")), { once: true });
      });
      const pending = accountBookings.createReservation({});
      const rejected = assert.rejects(pending, (error) => error.status === 0
        && error.message.includes("may have been saved") && error.message.includes("check your reservations"));
      bookingTest.mock.timers.tick(30_000);
      await rejected;
    });
    await t.test("network and abort errors never become success", async () => {
      globalThis.fetch = async () => { throw new TypeError("offline"); };
      await assert.rejects(() => qr.verifyQr({}), (error) => error.status === 0);
      await assert.rejects(() => reservations.fetchReservation(user, "id"), (error) => error.status === 0);
      globalThis.fetch = async () => { throw new DOMException("cancelled", "AbortError"); };
      await assert.rejects(() => reservations.fetchReservation(user, "id"), (error) => error.name === "AbortError");
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalStorage;
    await server.close();
  }
});
