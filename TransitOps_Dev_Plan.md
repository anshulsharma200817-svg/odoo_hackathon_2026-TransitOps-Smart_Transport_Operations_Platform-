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
- [ ] Init Django project + DRF, connect Postgres (or SQLite if speed matters more than realism)
- [ ] Build all 6 models: `User`, `Vehicle`, `Driver`, `Trip`, `MaintenanceLog`, `FuelLog`/`Expense` (coordinate field names with Dev B before migrating)
- [ ] Vehicle fields: `registration_number` (unique), `name_model`, `type`, `max_load_capacity`, `odometer`, `acquisition_cost`, `status`, `region`
- [ ] Driver fields: `name`, `license_number`, `license_category`, `license_expiry_date`, `contact_number`, `safety_score`, `status`
- [ ] Trip fields: `source`, `destination`, `vehicle` (FK), `driver` (FK), `cargo_weight`, `planned_distance`, `status`, `final_odometer`, `fuel_consumed`
- [ ] Run migrations
- [ ] Seed fixture: 2-3 vehicles, 2-3 drivers, 1 admin user (make sure Van-05 / Alex exist exactly as in the spec's example workflow)
- [ ] **Push** — scaffold + models. Everyone else branches off this commit.

### Hour 2 — Auth + Roles
- [ ] Install `djangorestframework-simplejwt`
- [ ] Add `role` field to User: `Fleet Manager`, `Driver`, `Safety Officer`, `Financial Analyst`
- [ ] `/api/auth/signup/`, `/api/auth/login/`, `/api/auth/refresh/`
- [ ] Permission check decorator/mixin for sensitive actions (dispatch, complete, cancel) — don't overbuild RBAC, just gate the backend actions that matter
- [ ] **Push**

### Hour 3 — Vehicle/Driver Serializers + ViewSets
- [ ] Vehicle CRUD ViewSet + serializer
- [ ] Driver CRUD ViewSet + serializer
- [ ] `/api/vehicles/available/` — only `Available` status
- [ ] `/api/drivers/available/` — `Available`, license not expired, not `Suspended`
- [ ] **Push**

### Hour 4 — Trip Rule Engine (the core of the whole app)
- [ ] `Trip.dispatch()` method, validates in order:
  - vehicle status == Available
  - driver status == Available
  - driver license not expired
  - driver status != Suspended
  - `cargo_weight <= vehicle.max_load_capacity`
  - on success: vehicle.status = On Trip, driver.status = On Trip, trip.status = Dispatched
- [ ] `Trip.complete()` — takes final odometer + fuel consumed, sets vehicle/driver back to Available, trip → Completed
- [ ] `Trip.cancel()` — only valid if trip.status == Dispatched, restores vehicle/driver to Available, trip → Cancelled
- [ ] Wire these to `/api/trips/{id}/dispatch/`, `/complete/`, `/cancel/`
- [ ] **Push** — this is the heart of the app, don't rush it

### Hour 5 — Tests + Hardening
- [ ] Write 2-3 quick tests against the exact Van-05/Alex scenario from spec Section 5
- [ ] Confirm: dispatching an already-On-Trip vehicle/driver is rejected
- [ ] Confirm: cargo over capacity is rejected
- [ ] **Push**

### Hours 6-8 — Float / Support
- [ ] Help Dev B with maintenance/fuel edge cases that touch Vehicle status
- [ ] Help Dev C debug API integration issues
- [ ] Buffer for whatever breaks during the final demo run-through

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
- [ ] `/api/reports/` per-vehicle:
  - **Fuel Efficiency** = `Distance / Fuel`
  - **Operational Cost** = `Fuel + Maintenance + Expenses (excluding MAINTENANCE-type)` — see decision log below, this diverges from the spec's literal wording
  - **ROI** = `(Revenue − (Maintenance + Fuel)) / Acquisition Cost`
- [ ] `/api/reports/export/csv/` — convert the report table to CSV, return as file download (PDF export is optional, skip unless time remains)
- [ ] **Push**

**⚠ Decision log (done in Hour 3, ahead of schedule):** Operational Cost now includes non-MAINTENANCE-type `Expense` amounts (tolls, misc costs) on top of Fuel + Maintenance, rather than the spec's literal `Fuel + Maintenance` only. MAINTENANCE-type Expense entries are excluded to avoid double-counting against `MaintenanceLog.cost`. Verified against Van-05: `65.50 (fuel) + 12.75 (toll) + 50 (maintenance) = 128.25`. Flagged to Dev A/Dev C — revisit if the team wants strict spec compliance instead.

**⚠ Open blocker:** `revenue` in the ROI formula is hardcoded to `0` — no revenue field/model exists anywhere in the spec's entity list (Section 6). Every vehicle will show negative ROI until the team decides where revenue comes from (per-trip rate? manual entry field on Vehicle or Trip?). Needs resolving before this section is truly done — currently the formula runs but the output isn't meaningful.
### Hours 6-8 — Filters, Bug Fixes, Support
- [ ] Add filters (vehicle type, status, region) to list endpoints where missing
- [ ] Help Dev C wire up chart data (utilization bar, cost line chart) — make sure `/api/dashboard/` and `/api/reports/` shapes are chart-friendly
- [ ] Bug fixes as they surface

---

## Dev C — Frontend (React + Tailwind)

**Owns:** Everything the user sees. Builds against the API contract from Hour 1 using mock JSON until real endpoints land, then swaps in real calls as A and B push.

### Hour 1 — Scaffold
- [ ] Vite + Tailwind setup
- [ ] Routing shell: `/login`, `/dashboard`, `/vehicles`, `/drivers`, `/trips`, `/maintenance`, `/fuel-expenses`, `/reports`
- [ ] Layout + nav (role-aware menu items, even if role-gating is basic)
- [ ] **Push**

### Hour 2 — Auth Screens
- [ ] Login + signup forms
- [ ] Wire to Dev A's real `/api/auth/login/` and `/api/auth/signup/` by end of hour
- [ ] Store JWT, set up protected routes (redirect to `/login` if no token)
- [ ] **Push**

### Hour 3 — Vehicle/Driver CRUD Screens
- [ ] Vehicle list + create/edit form
- [ ] Driver list + create/edit form
- [ ] Status badges (color-coded: Available green, On Trip blue, In Shop orange, Retired/Suspended gray)
- [ ] **Push**

### Hour 4 — Trip Flow
- [ ] Trip creation form: source, destination, vehicle dropdown (calls `/api/vehicles/available/`), driver dropdown (calls `/api/drivers/available/`), cargo weight, planned distance
- [ ] Dispatch / Complete / Cancel buttons wired to Dev A's endpoints as they land mid-hour
- [ ] Surface validation errors clearly (e.g. "Cargo exceeds vehicle capacity")
- [ ] **Push**

### Hour 5 — Maintenance & Fuel/Expense Forms
- [ ] Maintenance log create/close UI, wired to Dev B
- [ ] Fuel log entry form
- [ ] Expense entry form
- [ ] **Push**

### Hour 6 — Dashboard
- [ ] KPI cards: Active Vehicles, Available Vehicles, In Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization %
- [ ] Recharts: utilization bar chart, cost trend line chart
- [ ] **Push**

### Hour 7 — Reports + Polish
- [ ] Reports page (Fuel Efficiency, Op Cost, ROI table)
- [ ] CSV download button wired to Dev B's export endpoint
- [ ] Filters (vehicle type, status, region) applied across dashboard/vehicle/driver views
- [ ] Responsive pass at mobile width
- [ ] **Push**

### Hour 8 — Demo Run-Through
- [ ] Full run-through of the Van-05/Alex demo scenario with the whole team
- [ ] Fix whatever breaks live
- [ ] Rehearse the demo narration around this exact scenario (it's basically given to you in spec Section 5)

---

## Demo Script (all 3 devs should know this cold)

1. Register vehicle **Van-05**, max capacity 500 kg → status Available
2. Register driver **Alex** with a valid license
3. Create trip, cargo weight = 450 kg
4. System validates 450 ≤ 500, allows dispatch
5. Dispatch → vehicle & driver flip to On Trip
6. Complete trip → enter final odometer + fuel consumed → both flip back to Available
7. Create maintenance record (Oil Change) → vehicle → In Shop, disappears from dispatch pool
8. Show Reports page updating operational cost + fuel efficiency from the latest trip/fuel log
9. Show Dashboard KPIs and CSV export

## Skip List (only touch if Sections 3 & 4 are 100% done and demoed once, successfully)
Email reminders for expiring licenses · Dark mode · PDF export · Vehicle document management · Advanced search/sort
