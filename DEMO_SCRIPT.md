# TransitOps — Hour 8 Live Demo Script & Rehearsal Guide

> [!IMPORTANT]
> **JWT Session & Token Refresh Safety Note**:
> The application uses a 5-minute JWT access token with automatic background refresh handled via an Axios response interceptor (`POST /api/auth/refresh/`). If a token expires mid-demo, the interceptor automatically refreshes it transparently. **However, as a best-practice safety margin before presenting to judges, whoever drives the demo should log out and log in fresh right before starting.**

---

## Complete Demo Scenario Walkthrough (`Van-05` / `Alex`)

**Total Target Rehearsal Time**: ~45 to 60 seconds of live clicking/narration.

### Step 0: Pre-Flight Check (0:00 - 0:05)
- **Action**: Open `http://localhost:5173/login`.
- **Input**: Login as `dev@test.com` (password: `password123`).
- **Verify**: Redirected to `/dashboard` cleanly with real backend data loaded.

### Step 1: Verify & Register Fleet Seed Data (0:05 - 0:15)
- **Action**: Navigate to **Vehicles** (`/vehicles`) via Sidebar.
- **Narration**: *"We have our core fleet registered, including `VAN-05` (`Tata Ace`) with a max load capacity of `500 kg` and status `Available`."*
- **Action**: Navigate to **Drivers** (`/drivers`) via Sidebar.
- **Narration**: *"Our assigned driver `Alex` is registered with a valid, non-expired LMV license (`LIC-ALEX-001`) and safety score `100.00`, ready for dispatch."*

### Step 2: Create Trip & Validate Capacity Rules (0:15 - 0:25)
- **Action**: Navigate to **Trips** (`/trips`) → Click **+ New Trip**.
- **Input**:
  - Source: `Mumbai Depot A`
  - Destination: `Customer Hub B`
  - Vehicle: `VAN-05`
  - Driver: `Alex`
  - Cargo Weight: `450` kg (`450 ≤ 500`)
  - Planned Distance: `100` km
- **Action**: Click **Create Trip**.
- **Narration**: *"The system validates that our `450 kg` cargo is within `VAN-05`'s `500 kg` capacity and creates the trip in `Draft` status."*

### Step 3: Dispatch & Live Status Sync (0:25 - 0:35)
- **Action**: On the newly created trip row, click **Dispatch**.
- **Verify**: Trip status immediately updates to `Dispatched`.
- **Action**: Quickly check or note that `VAN-05` and `Alex` both atomically transition to `On Trip` across all status boards, locking them out from concurrent dispatches.

### Step 4: Complete Trip & Odometer Rollback Protection (0:35 - 0:45)
- **Action**: Click **Complete** on the dispatched trip.
- **Step 4a (Demonstrate Rollback Defense - Optional/Backup Check)**: If demonstrating validation to judges, enter `11000` km (`< 12000` starting odometer). Notice the immediate error: `Final odometer (11000.00) cannot be less than the starting odometer (12000.00).`
- **Step 4b (Successful Completion)**:
  - Final Odometer: `12150` km
  - Fuel Consumed: `15` L
- **Action**: Click **Complete Trip**.
- **Verify**: Trip status updates to `Completed`. `VAN-05`'s odometer advances to `12150.00 km`, and both `VAN-05` and `Alex` return to `Available` status.

### Step 5: Maintenance Workflow & Pool Exclusion (0:45 - 0:52)
- **Action**: Navigate to **Maintenance** (`/maintenance`) → Fill out **Log New Maintenance**:
  - Vehicle: `VAN-05`
  - Description: `Routine 10,000 km Oil Change`
  - Cost: `1200` ₹
  - Date Opened: `Today`
- **Action**: Click **Open Maintenance Log**.
- **Verify & Narration**: *"Opening this maintenance record instantly transitions `VAN-05` to `In Shop` status (`status: IN_SHOP`), automatically removing it from the available vehicles pool for any future trip dispatch."*

### Step 6: Financial Reports & CSV Export (0:52 - 1:00)
- **Action**: Navigate to **Reports** (`/reports`).
- **Verify**: `VAN-05` appears on the financial report table showing:
  - Operational Cost: `₹5,950` (reflecting both the fuel consumed during our trip and our new maintenance record).
  - Fuel Efficiency and ROI metrics calculated per contract.
- **Action**: Click **Export CSV**.
- **Verify**: The browser cleanly downloads `reports.csv` directly from the live backend `GET /api/reports/export/csv/` endpoint.

---

## Contingency Checklist
1. **Resetting `VAN-05` status before another dry run**: If `VAN-05` is left `IN_SHOP` from a practice run, go to `/maintenance` and click **Close Log** on the open maintenance record (`Oil Change`). `VAN-05` will instantly revert to `Available`.
2. **Backend Server Running**: Confirm `python manage.py runserver 0.0.0.0:8000` (or Docker container) is running before opening the browser.
