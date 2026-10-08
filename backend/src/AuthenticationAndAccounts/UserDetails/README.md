# UserDetails collection

Authentication & Accounts uses one MongoDB collection for all account roles:

- Database: `SolarMicrogridDB`
- Collection: `UserDetails`

The `role` field distinguishes `Backoffice`, `GridOperator`, and `Prosumer` documents. Roles do not receive separate collections.

## Common document shape

```json
{
  "_id": "ObjectId",
  "username": "web-user-or-nic",
  "nic": "prosumer-nic-or-web-identifier",
  "passwordHash": "ASP.NET PasswordHasher output",
  "role": "Prosumer",
  "isActive": true,
  "accountStatus": "Active",
  "name": "Full name",
  "email": "person@example.com",
  "contactNumber": "+94110000000",
  "address": "Address when applicable",
  "createdAtUtc": "2026-09-29T00:00:00Z"
}
```

Web users use `Backoffice` or `GridOperator` roles and are created active. Web and Android registration creates a `Prosumer` document with a unique `nic`, `Active`, and `isActive: true`, allowing immediate login without Backoffice activation. Passwords are never stored as plaintext.

The station, booking-slot, and reservation components must use their own agreed collections; this component only owns `UserDetails`.
