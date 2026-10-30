# MASTER SYSTEM SPECIFICATION: COURTCONNECT PWA
## Local Sports Booking & Venue Management Platform
**Target Location:** Melvisharam & Vellore District, Tamil Nadu  
**Business Goal:** Zero-cost operational footprint on GCP with Day-1 cash-flow positive revenue.  
**GCP Project ID:** `utility-glider-393102` (`us-east1`)

---

## 1. TECH STACK & ARCHITECTURE
- **Frontend & PWA:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, PWA Manifest & Service Workers.
- **Backend API:** Next.js Serverless API Routes (`src/app/api/...`) deployed to GCP Cloud Run.
- **Database & ORM:** PostgreSQL managed via Prisma ORM on GCP Cloud SQL (`utility-glider-393102:us-east1:turf-db-prod`).
- **Concurrency Engine:** Redis 7 via `ioredis` (5-minute transient slot locking) on GCP Compute Engine (`e2-micro`, Internal IP: `10.128.0.2`).
- **Payment Verification:** Direct UPI Intent links (`upi://pay`) + Google AI Studio Gemini Vision API (`gemini-2.5-flash`) for automated screenshot verification in <2s.
- **Asset Delivery & CDN:** Firebase Hosting + GCP Artifact Registry (`utility-glider-393102/turf-repo`).

---

## 2. PROVISIONED GCP INFRASTRUCTURE CONFIGURATION

### GCP Connection Constants
- **GCP Project ID:** `utility-glider-393102`
- **GCP Region:** `us-east1`
- **Cloud SQL Connection Name:** `utility-glider-393102:us-east1:turf-db-prod`
- **Cloud SQL Unix Socket Host:** `/cloudsql/utility-glider-393102:us-east1:turf-db-prod`
- **Artifact Registry Repo:** `turf-repo`
- **Compute Engine Redis VM:** `e2-micro` Docker container on Port `6379`

### Environment File Template (`.env.local` / GCP Cloud Run Environment Variables)
```env
### Primary Neon Database Connection
```env
# Neon PostgreSQL Connection URL
DATABASE_URL="your-neon-postgresql-connection-url"
# Redis Concurrency VM (Compute Engine Internal IP)
REDIS_HOST="10.128.0.2"
REDIS_PORT="6379"
REDIS_PASSWORD="your-redis-password"

# Google AI Studio API Key (Gemini Vision Verification)
GEMINI_API_KEY="your-gemini-api-key"

# Next.js App Metadata
NEXT_PUBLIC_APP_URL="[https://courtconnect.run.app](https://courtconnect.run.app)"



4.2 Handling the 12 Core Operational Scenarios
Prevent Double Booking: Enforced via atomic Redis 5-minute locks (SET slot:{courtId}:{ISO_slotStart} userId NX EX 300).
Online Player Booking: User clicks UPI link (upi://pay?pa=YOUR_UPI_ID@upi&pn=CourtConnect&am=${totalPayable}&tn=${bookingId}). User uploads GPay/PhonePe screenshot. Server route /api/payments/verify-receipt calls Gemini Vision API (gemini-2.5-flash), extracts UTR/Amount, verifies validity, updates booking to CONFIRMED, and releases Redis lock.
Owner Direct Bookings (Walk-in / Phone): Owner blocks slot via dashboard calendar quick-entry modal. paymentMode set to OFFLINE_CASH or PHONE_BOOKING. Convenience fee is ₹0. Online payment gateway and AI verification are bypassed.
External Bookings (Manual Sync): Enables owners to sync direct ground bookings or legacy entries.
Abandoned Checkout Cleanup: Redis key automatically expires after 300 seconds, releasing held slots back to the public pool.
Payment Failures: Safe recovery flow allows users to retry payment within the active 5-minute hold window before slot expiration.
Cancellations & Refunds: Automated cancellation workflow updates status to CANCELLED and triggers refund calculations based on rules.
Venue Closures & Maintenance: Owners can select date ranges and mark courts as MAINTENANCE (rendered disabled in UI).
Price & Schedule Changes: Dynamic rate configuration for weekend/evening peak hours vs. weekday mornings.
Network/Server Failures: Idempotent API endpoints ensure retried requests don't duplicate database bookings.
Fraud & Access Control: Role-Based Access Control (RBAC) separating Player, Owner, and Admin capabilities.
Notifications: Firebase Cloud Messaging (FCM) web push alerts for instant booking confirmations and match reminders.
5. COMPLETE 18-SCREEN SYSTEM INVENTORY
A. Player Experience Screens (Mobile PWA First)
S1: Home & Venue Discovery (/) — Location selector, sport pill filters, venue cards list, and sticky bottom navigation.
S2: Venue Details (/venue/[id]) — Photo gallery, amenities pills, court selector tabs, and sticky booking bar.
S3: Interactive Time Slot Grid (/venue/[id]/book) — 7-day strip with green (available), slate (locked), and emerald (selected) slots.
S4: Checkout & Payment Modal (/checkout/[bookingId]) — Summary card with itemized breakdown ('Court Rate: ₹800' + 'Convenience & Service Fee: ₹25'), 5-minute countdown, UPI deep link button, and screenshot upload box.
S5: Booking Confirmation (/booking/success/[id]) — Success checkmark animation, QR code pass, Google Maps directions button, and calendar sync.
S6: My Bookings & Digital Pass (/my-bookings) — Active vs past tabs, QR check-in badges, and Service Worker offline pass caching.
S7: Player Profile (/profile) — Phone number, name, notification toggles, and dark mode state.
S8: Cancellation Request (/booking/cancel/[id]) — Cancellation policy warning, reason selector, and refund calculation.
B. Venue Owner Panel (Dashboard)
S9: Owner Overview Dashboard (/owner) — Daily metrics (bookings count, cash collected, online payouts due, occupancy rate).
S10: Unified Multi-Court Calendar (/owner/calendar) — Day/Week view with vertical time rows and color-coded tags (Online, Walk-in, Phone, Maintenance).
S11: Quick-Entry Manual Modal (/owner/quick-entry) — 1-tap slot block modal for walk-in cash, phone, and direct ground UPI players with ₹0 fee.
S12: Dynamic Pricing Rules Engine (/owner/pricing) — Hourly rate configurator per court with weekend peak-hour overrides.
S13: Maintenance & Closure Blocker (/owner/maintenance) — Date/time blocker for turf repairs or private events.
S14: Daily Settlement & Cash Ledger (/owner/finance) — Cash collected on-site vs online platform payouts ledger.
C. Super Admin Panel (Platform Owner)
S15: Global System Overview (/admin) — Total venues onboarded in Melvisharam/Vellore, total bookings count, and platform revenue log.
S16: Venue Verification Portal (/admin/venues) — Approve or reject new venue applications submitted by local turf owners.
S17: Platform Commission Ledger (/admin/payouts) — Audit trail of ₹25 convenience fees collected and automated bank payout logs.
S18: Dispute & Refund Resolver (/admin/disputes) — Handle double-booking conflicts, forced refunds, or verification failures.
6. UI/UX DESIGN TOKENS & STYLING RULES
Theme Base: OLED Deep Dark (#0B0F17), Elevated Cards (#161F30), Glassmorphism (backdrop-blur-md bg-surface/80 border border-slate-800).
Accents: Electric Neon Emerald (#10B981) for available slots & CTA buttons, Cyber Cyan (#06B6D4) for active locks.
Mobile Styling: Fixed bottom navigation bar (BottomNav.tsx), full-width touch-friendly slot buttons, and PWA offline pass caching.
Desktop Styling: Multi-column dashboard layouts with side-by-side court schedules and responsive data tables