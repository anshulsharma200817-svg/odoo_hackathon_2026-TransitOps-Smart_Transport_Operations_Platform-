# TransitOps — 8-Hour Build Plan

**Stack:** Django + DRF · PostgreSQL/SQLite · JWT auth · React (Vite) + Tailwind · Recharts

**Golden rule:** Section 3 & 4 of the spec (Functional Requirements + Mandatory Business Rules) = required. Section 8 (Bonus Features) = stretch, touch nothing there until Van-05/Alex demo runs clean end-to-end.

---

## Shared API Contract (lock this in the first 30 min, together)

All three devs need this before they can work in parallel. Dev A owns the models; Dev B and Dev C build against this contract using mock JSON until real endpoints land.

### Auth
| Method | Endpoint | Body / Notes |
|---|---|---|
| POST | `/api/auth/signup/` | `{email, password, role}` |
| POST | `/api/auth/login/` | `{email, password}` → `{access, refresh, role}` |
| POST | `/api/auth/refresh/` | `{refresh}` |

### Vehicles
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/vehicles/` | filters: `?status=`, `?type=`, `?region=` |
| GET | `/api/vehicles/available/` | only `Available` status, for trip dropdown |
| POST | `/api/vehicles/` | create |
| PATCH | `/api/vehicles/{id}/` | edit |

### Drivers
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/drivers/` | filters: `?status=` |
| GET | `/api/drivers/available/` | `Available` + license not expired + not `Suspended` |
| POST | `/api/drivers/` | create |
| PATCH | `/api/drivers/{id}/` | edit |

### Trips
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/trips/` | list, filter by status |
| POST | `/api/trips/` | create (Draft) |
| POST | `/api/trips/{id}/dispatch/` | runs all validations |
| POST | `/api/trips/{id}/complete/` | body: `{final_odometer, fuel_consumed}` |
| POST | `/api/trips/{id}/cancel/` | only valid from Dispatched |

### Maintenance
| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/api/maintenance/` | create sets vehicle → In Shop |
| POST | `/api/maintenance/{id}/close/` | sets vehicle → Available (unless Retired) |

### Fuel & Expenses
| Method | Endpoint | Notes |
|---|---|---|
| GET/POST | `/api/fuel-logs/` | `{vehicle, liters, cost, date}` |
| GET/POST | `/api/expenses/` | `{vehicle, type, amount, date}` |

### Dashboard & Reports
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/dashboard/` | all KPI numbers in one payload |
| GET | `/api/reports/` | fuel efficiency, op cost, ROI per vehicle |
| GET | `/api/reports/export/csv/` | triggers CSV download |

**Status enums** (agree once, never touch again):
- Vehicle: `Available`, `On Trip`, `In Shop`, `Retired`
- Driver: `Available`, `On Trip`, `Off Duty`, `Suspended`
- Trip: `Draft`, `Dispatched`, `Completed`, `Cancelled`

---

## Dev A — Backend Core (Auth + Trip Engine)

**Owns:** User, Vehicle, Driver, Trip models and all state-transition logic. This is the hardest, most rule-heavy part — give the rule engine the full hour it needs.

### Hour 1 — Project Setup & Models
- [x] Init Django project + DRF, connect Postgres (or SQLite if speed matters more than realism)
- [x] Build all 6 models: `User`, `Vehicle`, `Driver`, `Trip`, `MaintenanceLog`, `FuelLog`/`Expense` (coordinate field names with Dev B before migrating)
- [x] Vehicle fields: `registration_number` (unique), `name_model`, `type`, `max_load_capacity`, `odometer`, `acquisition_cost`, `status`, `region`
- [x] Driver fields: `name`, `license_number`, `license_category`, `license_expiry_date`, `contact_number`, `safety_score`, `status`
- [x] Trip fields: `source`, `destination`, `vehicle` (FK), `driver` (FK), `cargo_weight`, `planned_distance`, `status`, `final_odometer`, `fuel_consumed`
- [x] Run migrations
- [x] Seed fixture: 2-3 vehicles, 2-3 drivers, 1 admin user (make sure Van-05 / Alex exist exactly as in the spec's example workflow)
- [x] **Push** — scaffold + models. Everyone else branches off this commit.

### Hour 2 — Auth + Roles
- [x] Install `djangorestframework-simplejwt`
- [x] Add `role` field to User: `Fleet Manager`, `Driver`, `Safety Officer`, `Financial Analyst`
- [x] `/api/auth/signup/`, `/api/auth/login/`, `/api/auth/refresh/`
- [x] Permission check decorator/mixin for sensitive actions (dispatch, complete, cancel) — don't overbuild RBAC, just gate the backend actions that matter
- [x] **Push**

**⚠ Open blocker (found by Dev C during Hour 6 reconciliation):** `POST /api/auth/login/` currently returns only `{access, refresh}` — no `role`, even though this contract specifies `{access, refresh, role}`. `LoginView(TokenObtainPairView): pass` is an uncustomized passthrough, so it never includes role in the token response. Frontend already handles the missing role gracefully (sidebar just shows nothing instead of crashing), so this isn't blocking dev work, but it needs fixing before the demo since the role label is visible in the sidebar. Needs either a custom token serializer that adds `role` to the response, or the same via `/api/auth/refresh/` — Dev A's call on the cleanest way to do it.

**✅ Login role blocker resolved (Dev B/Bhavya):** Added `CustomTokenObtainPairSerializer` (overrides `validate()` to set `data["role"] = self.user.role`) and pointed `LoginView.serializer_class` at it. Independently re-verified by Dev C, not just taken at face value: signed up a fresh account and logged in against the real backend both via a raw `curl` call and through the actual frontend login flow — the live `POST /api/auth/login/` response body genuinely includes `"role":"FLEET_MANAGER"` in both checks, and it persists correctly into the sidebar via `localStorage`.

**⚠ Open risk (found by Dev C during Hour 7 in-browser testing):** No `SIMPLE_JWT` override in `settings.py`, so the access token uses simplejwt's library default lifetime (~5 minutes). Nothing in the frontend calls `POST /api/auth/refresh/` despite it being in this contract and implemented on the backend - once the access token expires mid-session, every `api/*.js` module's mock-fallback logic treats the resulting 401 as "backend unreachable" and silently serves mock data instead, with zero visible warning to the user. Hit this repeatedly during Hour 7 testing (had to re-login every ~5 minutes to keep testing against real data). Not a correctness bug in what's shipped, but a real risk for Hour 8: if the demo run-through takes longer than ~5 minutes without re-logging in, the screen will start showing stale/mock numbers that look plausible but aren't real. Cheapest mitigations for Hour 8: either bump `ACCESS_TOKEN_LIFETIME` in `SIMPLE_JWT` settings for the demo, or just plan to re-login right before presenting.

### Hour 3 — Vehicle/Driver Serializers + ViewSets
- [x] Vehicle CRUD ViewSet + serializer
- [x] Driver CRUD ViewSet + serializer
- [x] `/api/vehicles/available/` — only `Available` status
- [x] `/api/drivers/available/` — `Available`, license not expired, not `Suspended`
- [x] **Push**

### Hour 4 — Trip Rule Engine (the core of the whole app)
- [x] `Trip.dispatch()` method, validates in order:
  - vehicle status == Available
  - driver status == Available
  - driver license not expired
  - driver status != Suspended
  - `cargo_weight <= vehicle.max_load_capacity`
  - on success: vehicle.status = On Trip, driver.status = On Trip, trip.status = Dispatched
- [x] `Trip.complete()` — takes final odometer + fuel consumed, sets vehicle/driver back to Available, trip → Completed
- [x] `Trip.cancel()` — only valid if trip.status == Dispatched, restores vehicle/driver to Available, trip → Cancelled
- [x] Wire these to `/api/trips/{id}/dispatch/`, `/complete/`, `/cancel/`
- [x] **Push** — this is the heart of the app, don't rush it

### Hour 5 — Tests + Hardening
- [x] Write 2-3 quick tests against the exact Van-05/Alex scenario from spec Section 5
- [x] Confirm: dispatching an already-On-Trip vehicle/driver is rejected
- [x] Confirm: cargo over capacity is rejected
- [x] **Push**

### Hours 6-8 — Float / Support
- [x] Help Dev B with maintenance/fuel edge cases that touch Vehicle status
- [x] Help Dev C debug API integration issues
- [x] Buffer for whatever breaks during the final demo run-through

---

## Dev B — Backend CRUD + Reports (Maintenance, Fuel/Expense, Dashboard, CSV)

**Owns:** Simpler, well-defined CRUD, plus all the aggregate math. Less rule-heavy than Dev A's track, but the formulas need to be exactly right.

### Hour 1 — API Contract + Stubs
- [x] Lock the shared API contract above with Dev A and Dev C
- [x] Stub empty endpoints (`/api/maintenance/`, `/api/fuel-logs/`, `/api/expenses/`, `/api/dashboard/`, `/api/reports/`) returning mock JSON so Dev C isn't blocked
- [x] **Push**

### Hour 2 — Maintenance
- [x] `MaintenanceLog` model: `vehicle` (FK), `description`, `date_opened`, `date_closed`, `status` (Open/Closed)
- [x] `enter_maintenance()` — creating an active record sets vehicle.status → In Shop, removes it from dispatch pool automatically
- [x] `close_maintenance()` — sets vehicle.status → Available, **unless** vehicle.status was already Retired (then leave it Retired)
- [x] Endpoints: `POST /api/maintenance/`, `POST /api/maintenance/{id}/close/`
- [x] **Push**

### Hour 3 — Fuel & Expense
- [x] `FuelLog` model: `vehicle` (FK), `liters`, `cost`, `date`
- [x] `Expense` model: `vehicle` (FK), `type` (toll/maintenance/other), `amount`, `date`
- [x] CRUD endpoints for both
- [x] **Push**

### Hour 4 — Dashboard KPI Endpoint
- [x] `/api/dashboard/` returns in one payload:
  - Active Vehicles, Available Vehicles, Vehicles In Maintenance
  - Active Trips, Pending Trips
  - Drivers On Duty
  - **Fleet Utilization %** = `(Vehicles On Trip / Total Active Vehicles) × 100`
- [x] Add query params for filters: `?type=`, `?status=`, `?region=`
- [x] **Push**

### Hour 5 — Reports + CSV
- [x] `/api/reports/` per-vehicle:
  - **Fuel Efficiency** = `Distance / Fuel`
  - **Operational Cost** = `Fuel + Maintenance + Expenses (excluding MAINTENANCE-type)` — see decision log below, this diverges from the spec's literal wording
  - **ROI** = `(Revenue − (Maintenance + Fuel)) / Acquisition Cost`
- [x] `/api/reports/export/csv/` — convert the report table to CSV, return as file download (PDF export is optional, skip unless time remains)
- [x] **Push**

**⚠ Decision log (done in Hour 3, ahead of schedule):** Operational Cost now includes non-MAINTENANCE-type `Expense` amounts (tolls, misc costs) on top of Fuel + Maintenance, rather than the spec's literal `Fuel + Maintenance` only. MAINTENANCE-type Expense entries are excluded to avoid double-counting against `MaintenanceLog.cost`. Verified against Van-05: `65.50 (fuel) + 12.75 (toll) + 50 (maintenance) = 128.25`. Flagged to Dev A/Dev C — revisit if the team wants strict spec compliance instead.

**✅ Revenue blocker resolved (Hour 5):** Dev A merged a fix — revenue is now computed as `planned_distance × $3.00` per completed trip. ROI is now meaningful. VAN-05 live output: `operational_cost: 128.25`, `roi: -0.0051` (negative until trips complete and revenue accumulates). Live-verified via `/api/reports/` and `/api/reports/export/csv/` — both endpoints confirmed working.
### Hours 6-8 — Filters, Bug Fixes, Support
- [x] Add filters (vehicle type, status, region) to list endpoints where missing
- [x] Help Dev C wire up chart data (utilization bar, cost line chart) — make sure `/api/dashboard/` and `/api/reports/` shapes are chart-friendly
- [x] Bug fixes as they surface

---

## Dev C — Frontend (React + Tailwind)

**Owns:** Everything the user sees. Builds against the API contract from Hour 1 using mock JSON until real endpoints land, then swaps in real calls as A and B push.

### Hour 1 — Scaffold
- [x] Vite + Tailwind setup
- [x] Routing shell: `/login`, `/dashboard`, `/vehicles`, `/drivers`, `/trips`, `/maintenance`, `/fuel-expenses`, `/reports`
- [x] Layout + nav (role-aware menu items, even if role-gating is basic)
- [x] **Push**

### Hour 2 — Auth Screens
- [x] Login + signup forms
- [x] Wire to Dev A's real `/api/auth/login/` and `/api/auth/signup/` by end of hour
- [x] Store JWT, set up protected routes (redirect to `/login` if no token)
- [x] **Push**

### Hour 3 — Vehicle/Driver CRUD Screens
- [x] Vehicle list + create/edit form
- [x] Driver list + create/edit form
- [x] Status badges (color-coded: Available green, On Trip blue, In Shop orange, Retired/Suspended gray)
- [x] **Push**

### Hour 4 — Trip Flow
- [x] Trip creation form: source, destination, vehicle dropdown (calls `/api/vehicles/available/`), driver dropdown (calls `/api/drivers/available/`), cargo weight, planned distance
- [x] Dispatch / Complete / Cancel buttons wired to Dev A's endpoints as they land mid-hour
- [x] Surface validation errors clearly (e.g. "Cargo exceeds vehicle capacity")
- [x] **Push**

### Hour 5 — Maintenance & Fuel/Expense Forms
- [x] Maintenance log create/close UI, wired to Dev B
- [x] Fuel log entry form
- [x] Expense entry form
- [x] **Push**

### Hour 6 — Dashboard
- [x] KPI cards: Active Vehicles, Available Vehicles, In Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %
- [x] Recharts: utilization bar chart, cost trend line chart
- [x] **Push**

### Hour 7 — Reports + Polish
- [x] Reports page (Fuel Efficiency, Op Cost, ROI table) - verified numbers against raw `/api/vehicles/`, `/api/maintenance/`, `/api/fuel-logs/`, `/api/expenses/` data by hand-computing expected values first
- [x] CSV download button wired to Dev B's export endpoint - real file download (blob), not a client-generated CSV; response body checked and matches the on-screen table exactly
- [x] Filters (vehicle type, status, region) applied across dashboard/vehicle/driver views - Dashboard had none before this hour, added and verified against real `/api/dashboard/?status=...` responses; Vehicles already had all three (Hour 3); Drivers only needs `?status=` per contract, already had it
- [x] Responsive pass at mobile width - and tablet (768px) and desktop, per Dev C's own read of the ask. Found and fixed real overflow bugs: page headers switching to row layout too early (`sm:` → `lg:`) once the persistent sidebar appears at `md`, causing severely squeezed heading/button text; 4 KPI card label+badge rows overflowing their card at tablet width (`min-w-0 truncate` + `shrink-0` fix)
- [x] **Push**

### Hour 8 — Demo Run-Through
- [x] Full run-through of the Van-05/Alex demo scenario verified against live backend
- [x] Token refresh interceptor implemented in `api/client.js` to eliminate 5-minute session drops
- [x] Rehearse the demo narration around this exact scenario (see `DEMO_SCRIPT.md` for click-by-click timings)

---

## Demo Script (all 3 devs should know this cold — see `DEMO_SCRIPT.md` for full timing & narration)

> **Note on JWT Token Safety**: Automatic token refresh (`POST /api/auth/refresh/`) is wired into the frontend response interceptor. However, as a safety margin, whoever drives the demo should log out and log in fresh right before presenting.

1. Register/verify vehicle **Van-05**, max capacity 500 kg → status Available (`0:05`)
2. Register/verify driver **Alex** with a valid license (`0:10`)
3. Create trip, cargo weight = 450 kg (`0:20`)
4. System validates 450 ≤ 500, allows dispatch (`0:25`)
5. Dispatch → vehicle & driver flip to On Trip (`0:30`)
6. Complete trip → enter final odometer (`12150` km > `12000` starting odometer) + fuel consumed (`15` L) → both flip back to Available and odometer advances (`0:40`)
7. Create maintenance record (Oil Change) → vehicle → In Shop, disappears from dispatch pool (`0:48`)
8. Show Reports page updating operational cost + fuel efficiency from the latest trip/fuel log (`0:55`)
9. Show Dashboard KPIs and test real CSV export download (`1:00`)

## Skip List (only touch if Sections 3 & 4 are 100% done and demoed once, successfully)
Email reminders for expiring licenses · Dark mode · PDF export · Vehicle document management · Advanced search/sort
