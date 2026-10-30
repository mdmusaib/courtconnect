# CourtConnect

CourtConnect is a mobile-first turf booking PWA for Melvisharam and Vellore. Players can discover venues, view live slot availability, hold a slot for 1 minute, pay by UPI, upload a payment receipt for Gemini verification, and keep a digital match pass offline.

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4
- Mock phone OTP authentication (shared test OTP `1234`) with `firebase-admin` ID-token verification kept as an optional compatibility path
- Signed HTTP-only session cookies with edge-safe RBAC middleware
- Prisma 6 with Neon PostgreSQL
- Redis slot locks (`ioredis`, NX + 300-second expiry)
- Gemini 2.5 Flash receipt verification (`@google/genai`)
- Firebase Cloud Messaging for booking confirmations and match-day reminders
- PWA manifest + service worker with offline pass caching

## Player routes

| Route | Purpose |
| --- | --- |
| `/` | Venue discovery, search, sport filters, next-game card |
| `/login` | Mock phone OTP sign-in (OTP `1234`); returns to the requested page |
| `/profile` | Verified phone, role badge, account links, sign out, push alerts |
| `/venue/[id]` | Venue details, amenities, court picker |
| `/venue/[id]/book` | Interactive 7-day slot matrix |
| `/checkout/[bookingId]` | UPI deep links, itemized breakdown, auto-upload receipt (signed-in players only) |
| `/booking/success/[id]` | Confirmed digital pass with QR code |
| `/booking/cancel/[id]` | Refund estimate, cancellation reason, and confirmed release |
| `/my-bookings` | Active and past bookings, push alerts, offline-ready passes |

Protected player routes redirect to `/login?next=…`. The session API at
`/api/auth/sync` accepts a verified mock phone identity (or a Firebase ID token
when configured), creates a new `PLAYER` on first sign-in — or the matching
`OWNER`/`ADMIN` role for the demo numbers — and sets the HTTP-only session
cookie.

## Owner routes

| Route / component | Purpose |
| --- | --- |
| `/owner` | Daily bookings, cash, online payouts, occupancy, court load, and direct ledger |
| `/owner/calendar` | Side-by-side multi-court day view and seven-day week timeline |
| `/owner/quick-entry` | Counter-focused quick-entry desk with the direct-entry modal open on load |
| `OwnerQuickEntryModal.tsx` | 1-tap direct-entry modal used from the dashboard, calendar, and quick-entry desk |

Owner direct entries use `POST /api/owner/bookings`. Walk-in cash, phone, and direct ground QR bookings are created as confirmed with a ₹0 platform fee, bypassing receipt upload and AI verification. The owner console reads the signed-in session; only `OWNER` and `ADMIN` roles can open `/owner/*`.

## Super Admin routes

| Route | Purpose |
| --- | --- |
| `/admin` | Platform overview, seven-day revenue pulse, verification queue, disputes, and audit trail |
| `/admin/venues` | Verify or reject venue listings with review notes |
| `/admin/payouts` | Global revenue ledger, filters, refund processing, and per-venue payout snapshot |
| `/admin/disputes` | Review player disputes and apply full, partial, or rejected refund overrides |
| `/admin/revenue` | Redirects to `/admin/payouts` |

Admin mutations are recorded in `AdminAction` with the acting admin, entity, summary, and before/after metadata. Only `VERIFIED` venues appear in player discovery and can be opened or booked. `/admin/*` is restricted to `ADMIN` sessions at both the middleware and API layers.

## Cancellation & refund policy

`POST /api/bookings/cancel` accepts `{ bookingId, reason }` and only works for the signed-in player's own online bookings. The court fee is refundable on a sliding scale; the ₹25 convenience fee is never refunded.

| Time before slot start | Court fee refunded |
| --- | --- |
| 24 hours or more | 100% |
| 6 to 24 hours | 75% |
| 2 to 6 hours | 50% |
| Under 2 hours | 0% |

Unpaid pending holds can be released with a ₹0 refund. Cancellation is blocked once the slot has started, and owner direct entries must be changed with the venue. Refunds created by players are stored as `PENDING`; an admin can mark them processed from `/admin/payouts` or approve an override from `/admin/disputes`.

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

Open `http://localhost:3000`.

Required environment variables live in `.env`:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `AUTH_SECRET` — random 32+ character secret used to sign the HTTP-only session JWT (`openssl rand -hex 32`)
- `REDIS_HOST`, `REDIS_PORT` — Redis used for slot locks
- `GEMINI_API_KEY` — Google AI Studio key for receipt vision
- `NEXT_PUBLIC_UPI_ID` — UPI collection ID used by checkout deep links
- `CRON_SECRET` — protects the match-day reminder endpoint in production
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` — optional; only needed for the legacy Firebase phone-auth branch or web push
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY` — required only for web push
- `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` — optional; server credentials for Firebase ID-token verification and FCM
- `DEMO_PLAYER_PHONE`, `DEMO_OWNER_PHONE`, `DEMO_ADMIN_PHONE` — optional seed account overrides

See `.env.example` for the full template. Replace `NEXT_PUBLIC_UPI_ID` with a real collection ID before accepting live payments.

## Authentication & RBAC

The checked-in build uses a mock phone OTP flow so every route can be exercised
without an SMS provider:

1. `src/components/PhoneAuthModal.tsx` accepts any 10-digit mobile number. The
   shared test OTP is **`1234`**; no SMS is sent.
2. `src/lib/auth-mock.ts` verifies the OTP, mints a short-lived mock phone
   token, and posts the token to `POST /api/auth/sync`.
3. The sync route validates the token (or accepts the test OTP directly),
   resolves the user by canonical phone number, and creates a missing account.
   The demo owner/admin numbers receive those roles; every other new number is
   created as `PLAYER`.
4. A 7-day HS256 session JWT is written to the `courtconnect_session` cookie
   (`HttpOnly`, `Secure` in production, `SameSite=Lax`). Middleware verifies it
   on the edge without a database round-trip.
5. Page layouts and API handlers re-read the user from PostgreSQL, so server-side
   authorization always uses the current role.

`POST /api/auth/sync` also still accepts `{ idToken }` and verifies it with
Firebase Admin when Firebase credentials are configured. The UI uses the mock
flow by default.

| Demo phone | Role | Name |
| --- | --- | --- |
| `+91 98765 43210` | `OWNER` | Test Owner |
| `+91 98765 43211` | `PLAYER` | Arjun Kumar |
| `+91 98765 43212` | `ADMIN` | Platform Admin |

| Route | Requirement |
| --- | --- |
| `/owner/*` | `OWNER` or `ADMIN` |
| `/admin/*` | `ADMIN` |
| `/checkout/*` | Any authenticated user; the booking must belong to that user |
| `/my-bookings`, `/profile`, `/booking/cancel/*` | Any authenticated user |

Unauthenticated page requests redirect to `/login?next=…`. Signed-in users with
the wrong role are redirected home with a one-time toast explaining which role
is required. API routes independently return `401 AUTH_REQUIRED` or
`403 ROLE_FORBIDDEN`; they never rely on middleware alone.

> **Production warning:** the shared OTP and client-minted mock token are for
> local demos only. Replace `src/lib/auth-mock.ts` with a real SMS provider (or
> re-enable the Firebase phone-auth path) before accepting production traffic.

## Demo data

The seed is idempotent and creates:

- Owner `Test Owner` (`9876543210`) with role `OWNER`
- Demo player `Arjun Kumar` (`9876543211`) with role `PLAYER`
- Platform admin `Platform Admin` (`9876543212`) with role `ADMIN`
- 3 venues and 7 courts across Melvisharam and Vellore, including one pending venue
- **Test Court (₹1 Mobile Test)** at Melvisharam Turf Arena, priced at ₹1/hour for end-to-end mobile payment testing
- 5 bookings: confirmed upcoming, past confirmed, pending checkout, cancelled/refunded, and confirmed cricket
- 2 disputes and an initial admin audit entry

To use the seeded accounts, open the sign-in modal and pick a demo account chip
(or type its number), then enter OTP `1234`. When a seeded phone signs in,
`/api/auth/sync` preserves its existing role. New phone numbers become players.
Promote any other owner or admin from Prisma Studio (`npx prisma studio`) or
with SQL:

```sql
UPDATE "User" SET role = 'OWNER' WHERE phone = '9876543210';
UPDATE "User" SET role = 'ADMIN' WHERE phone = '9876543212';
```

## PWA testing

Service worker registration is enabled in production builds by default:

```bash
npm run build
npm start
```

To enable it while running `next dev`, set `NEXT_PUBLIC_ENABLE_SW=true`.

The service worker caches static assets, the offline fallback, `/my-bookings`, and `/booking/success/[id]`. Opening `/my-bookings` automatically warms the cache for every active confirmed pass, so upcoming passes load offline without being visited first. Cached pages are stored locally on the device.

## Payment verification

`POST /api/payments/verify-receipt` accepts multipart form data:

- `bookingId`
- `receipt` (image, max 10 MB; `screenshot` and `file` are accepted aliases)

The route extracts the paid amount and 12-digit UTR, checks the amount against the booking, rejects duplicate UTRs, confirms the booking, and releases its Redis lock. Screenshots are not persisted because object storage is not configured; only the verified UTR and Gemini metadata (amount, status, app, payee, confidence, model, and verification time) are stored.

### ₹1 mobile end-to-end test

Use **Melvisharam Turf Arena → Test Court (₹1 Mobile Test)**. A one-hour booking is priced at:

```
Court rate            ₹1
Convenience fee      ₹25
Total payable        ₹26
```

Pay exactly ₹26 with GPay/PhonePe, upload the confirmation screenshot, and Gemini 2.5 Flash will verify it. The extracted UTR, amount, and status are printed to the browser console and shown in the **AI receipt verification** panel on `/booking/success/[id]`.

The convenience fee remains enabled to exercise the real production pricing path. If you need to test a net ₹1 UPI transfer instead, temporarily set `convenienceFee = 0` in the booking creation path rather than editing the seeded court price.

In development, booking creation falls back to database-only conflict checks if the private Redis host is unreachable. Production returns `503` instead of creating an unlocked booking.

## Push notifications

Players can enable device alerts from `/my-bookings`. The browser registers an FCM token through `POST /api/notifications/tokens`; disabling the toggle calls `DELETE /api/notifications/tokens`. Confirmed bookings trigger an instant push from receipt verification, and cancellations send a refund update.

Match-day reminders look 24 hours ahead for confirmed bookings that have not been reminded yet:

```bash
curl -X POST http://localhost:3000/api/notifications/match-day \
  -H "Authorization: Bearer $CRON_SECRET"
```

The endpoint also accepts `x-cron-secret`. Without `CRON_SECRET`, it is callable only outside production. Run it from a scheduler at least once per hour. The FCM helpers skip sending cleanly when credentials are missing, so local development works without Firebase.
