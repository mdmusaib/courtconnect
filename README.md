# CourtConnect

CourtConnect is a mobile-first turf booking PWA for Melvisharam and Vellore. Players can discover venues, view live slot availability, hold a slot for 1 minute, pay by UPI, upload a payment receipt for Gemini verification, and keep a digital match pass offline.

## Stack

- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4
- One-tap demo role switching for Player, Owner, and Admin — no OTP, SMS, Firebase, or third-party identity provider
- Signed HTTP-only HS256 session JWT written by `/api/auth/sync`; middleware auth checks are bypassed for feature testing
- Prisma 6 with Neon PostgreSQL
- Redis slot locks (`ioredis`, NX + 300-second expiry)
- Gemini 2.5 Flash receipt verification (`@google/genai`)
- Push notification delivery disabled in this build (FCM removed); booking confirmations and passes remain in-app
- PWA manifest + service worker with offline pass caching

## Player routes

| Route | Purpose |
| --- | --- |
| `/` | Venue discovery, search, sport filters, next-game card |
| `/login` | One-tap demo role picker; returns to the requested page |
| `/profile` | Demo identity, role badge, account links, sign out, notification status |
| `/venue/[id]` | Venue details, amenities, court picker |
| `/venue/[id]/book` | Interactive 7-day slot matrix |
| `/checkout/[bookingId]` | UPI deep links, itemized breakdown, auto-upload receipt (falls back to the demo player when no cookie is set) |
| `/booking/success/[id]` | Confirmed digital pass with QR code |
| `/booking/cancel/[id]` | Refund estimate, cancellation reason, and confirmed release |
| `/my-bookings` | Active and past bookings, push alerts, offline-ready passes |

Player routes render without a login wall. When no session cookie is present,
server pages fall back to the seeded demo player so bookings, passes, and
checkout still resolve. `/api/auth/sync` accepts `{ "role": "PLAYER" | "OWNER" |
"ADMIN" }` (or a demo phone number), reuses or creates the matching seeded
account, and writes the HTTP-only session cookie.

## Owner routes

| Route / component | Purpose |
| --- | --- |
| `/owner` | Daily bookings, cash, online payouts, occupancy, court load, and direct ledger |
| `/owner/calendar` | Side-by-side multi-court day view and seven-day week timeline |
| `/owner/quick-entry` | Counter-focused quick-entry desk with the direct-entry modal open on load |
| `OwnerQuickEntryModal.tsx` | 1-tap direct-entry modal used from the dashboard, calendar, and quick-entry desk |

Owner direct entries use `POST /api/owner/bookings`. Walk-in cash, phone, and direct ground QR bookings are created as confirmed with a ₹0 platform fee, bypassing receipt upload and AI verification. The owner console reads the selected session; when no cookie is present, or a player session opens `/owner/*`, it falls back to the seeded owner identity. An `ADMIN` session entering the owner console is mapped to that same seeded owner so the dashboard has venue data to render.

## Super Admin routes

| Route | Purpose |
| --- | --- |
| `/admin` | Platform overview, seven-day revenue pulse, verification queue, disputes, and audit trail |
| `/admin/venues` | Verify or reject venue listings with review notes |
| `/admin/payouts` | Global revenue ledger, filters, refund processing, and per-venue payout snapshot |
| `/admin/disputes` | Review player disputes and apply full, partial, or rejected refund overrides |
| `/admin/revenue` | Redirects to `/admin/payouts` |

Admin mutations are recorded in `AdminAction` with the acting admin, entity, summary, and before/after metadata. Only `VERIFIED` venues appear in player discovery and can be opened or booked. `/admin/*` is open in this testing build: a missing or non-admin session resolves to the seeded platform admin, and admin API actions attribute changes to that account instead of returning `403`.

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

No Firebase environment variables are required. See `.env.example` for the full template. Replace `NEXT_PUBLIC_UPI_ID` with a real collection ID before accepting live payments.

## Authentication & RBAC

This testing build has no login wall, OTP, SMS, or third-party identity
provider. One tap on a role button writes an HTTP-only session cookie through
`POST /api/auth/sync`:

1. The header role switcher (`src/components/auth/DevRoleSwitcher.tsx`),
   `/login` role buttons, and `PhoneAuthModal.tsx` post
   `{ "role": "PLAYER" | "OWNER" | "ADMIN" }` to `/api/auth/sync`. No phone
   number or verification code is required.
2. The sync route resolves the matching seeded account (upserting it if it is
   missing), then writes a 7-day HS256 JWT to the `courtconnect_session` cookie
   (`HttpOnly`, `Secure` in production, `SameSite=Lax`). The token is signed
   with `AUTH_SECRET` and exposes only `sub`, `uid`, `phone`, `role`, and
   `name`.
3. Server pages and API handlers re-read the user from PostgreSQL through
   `getSessionUser`. `requireSessionUser` and `requireRole` fall back to the
   matching demo identity instead of redirecting, so pages still render when the
   cookie is absent or the database is unavailable.
4. `src/middleware.ts` is a pass-through. No request is redirected to `/login`,
   and no API returns `401 AUTH_REQUIRED` or `403 ROLE_FORBIDDEN` for a missing
   or mismatched role.

| Demo phone | Role | Name |
| --- | --- | --- |
| `+91 98765 43210` | `OWNER` | Test Owner |
| `+91 98765 43211` | `PLAYER` | Arjun Kumar |
| `+91 98765 43212` | `ADMIN` | Platform Admin |

| Route | Behavior in this build |
| --- | --- |
| `/owner/*` | Any session renders; a missing or player session resolves to the demo owner, and an admin session is mapped to that owner so seeded venue data appears |
| `/admin/*` | Any session renders; a missing or non-admin session resolves to the seeded platform admin |
| `/checkout/*` | Any session; the booking must belong to that user, with the demo player as the fallback identity |
| `/my-bookings`, `/profile`, `/booking/cancel/*` | Any session; missing sessions fall back to the demo player |

> **Production warning:** role switching is intentionally unauthenticated for
> demos. Restore a real identity provider and re-enable middleware and API role
> checks before accepting production traffic.

## Demo data

The seed is idempotent and creates deterministic accounts and IDs that the role
switcher reuses:

| Role | Name | Phone | Seed ID |
| --- | --- | --- | --- |
| `OWNER` | Test Owner | `9876543210` | `6f1c2a10-0000-4000-8000-000000000001` |
| `PLAYER` | Arjun Kumar | `9876543211` | `6f1c2a10-0000-4000-8000-000000000002` |
| `ADMIN` | Platform Admin | `9876543212` | `6f1c2a10-0000-4000-8000-000000000003` |

The seed also creates:

- 3 venues and 7 courts across Melvisharam and Vellore, including one pending venue
- **Test Court (₹1 Mobile Test)** at Melvisharam Turf Arena, priced at ₹1/hour for end-to-end mobile payment testing
- 5 bookings: confirmed upcoming, past confirmed, pending checkout, cancelled/refunded, and confirmed cricket
- 2 disputes and an initial admin audit entry

Because the demo IDs match the seed, bookings, venues, and disputes stay
attached to the selected identity. Use the header role switcher to move between
Player, Owner, and Admin without signing out. To promote any other account, use
Prisma Studio (`npx prisma studio`) or SQL:

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

Push delivery is disabled in this build. `src/lib/fcm.ts` is a no-op stub that
keeps the previous return shapes, so booking confirmation, cancellation, and
reminder code paths still run without Firebase credentials. `/my-bookings`
shows a static notification card, while confirmed passes and offline caching
continue to work in-app.

The token endpoints remain for compatibility:

- `POST /api/notifications/tokens` stores a posted device token against the
  current demo user.
- `DELETE /api/notifications/tokens` removes that token.
- No token is registered automatically, and no notification is delivered.

Match-day reminders look 24 hours ahead for confirmed bookings that have not
been reminded yet:

```bash
curl -X POST http://localhost:3000/api/notifications/match-day \
  -H "Authorization: Bearer $CRON_SECRET"
```

The endpoint also accepts `x-cron-secret`. Without `CRON_SECRET`, it is callable
only outside production. The sweep currently responds with `configured: false`
and sends nothing, so it is safe to leave scheduled or disabled.
