import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Driver, Trip, Vehicle

User = get_user_model()


def make_client():
    """Return an authenticated APIClient (Fleet Manager role)."""
    user = User.objects.create_user(
        username="tester@test.com",
        email="tester@test.com",
        password="testpass123",
        role=User.Role.FLEET_MANAGER,
    )
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def make_vehicle(reg, type_, region, status=Vehicle.Status.AVAILABLE, capacity=1000, cost=500000):
    return Vehicle.objects.create(
        registration_number=reg,
        name_model=f"Model-{reg}",
        type=type_,
        region=region,
        max_load_capacity=capacity,
        odometer=0,
        acquisition_cost=cost,
        status=status,
    )


def make_driver(name, status=Driver.Status.AVAILABLE):
    return Driver.objects.create(
        name=name,
        license_number=f"LIC-{name}",
        license_category="LMV",
        license_expiry_date=datetime.date.today() + datetime.timedelta(days=365),
        safety_score=90,
        status=status,
    )


# ---------------------------------------------------------------------------
# Hour 4 — Dashboard KPI endpoint tests
# ---------------------------------------------------------------------------

class DashboardKPITests(TestCase):
    """Tests for GET /api/dashboard/ — payload shape and KPI values."""

    def setUp(self):
        self.client = make_client()
        # Fleet: 2 vans (North), 1 truck (South), 1 retired van (North)
        self.v_van1 = make_vehicle("VAN-01", "Van",   "North", Vehicle.Status.AVAILABLE)
        self.v_van2 = make_vehicle("VAN-02", "Van",   "North", Vehicle.Status.ON_TRIP)
        self.v_truck = make_vehicle("TRK-01", "Truck", "South", Vehicle.Status.IN_SHOP)
        self.v_retired = make_vehicle("RET-01", "Van", "North", Vehicle.Status.RETIRED)

        self.driver = make_driver("Alex", Driver.Status.ON_TRIP)
        self.driver2 = make_driver("Bob",  Driver.Status.AVAILABLE)

        # One dispatched trip on VAN-02, one draft trip on VAN-01
        self.trip_dispatched = Trip.objects.create(
            source="A", destination="B",
            vehicle=self.v_van2, driver=self.driver,
            cargo_weight=100, planned_distance=200,
            status=Trip.Status.DISPATCHED,
        )
        self.trip_draft = Trip.objects.create(
            source="C", destination="D",
            vehicle=self.v_van1, driver=self.driver2,
            cargo_weight=50, planned_distance=100,
            status=Trip.Status.DRAFT,
        )

    def get(self, params=""):
        return self.client.get(f"/api/dashboard/{params}")

    # -- 1. Response shape ---------------------------------------------------
    def test_response_contains_all_kpi_keys(self):
        r = self.get()
        self.assertEqual(r.status_code, 200)
        expected_keys = {
            "active_vehicles",
            "available_vehicles",
            "vehicles_in_maintenance",
            "active_trips",
            "pending_trips",
            "drivers_on_duty",
            "fleet_utilization_pct",
        }
        self.assertEqual(set(r.data.keys()), expected_keys)

    # -- 2. Unfiltered KPI values --------------------------------------------
    def test_unfiltered_kpi_values(self):
        r = self.get()
        d = r.data
        # active = all non-retired = VAN-01, VAN-02, TRK-01
        self.assertEqual(d["active_vehicles"], 3)
        self.assertEqual(d["available_vehicles"], 1)       # VAN-01
        self.assertEqual(d["vehicles_in_maintenance"], 1)  # TRK-01
        self.assertEqual(d["active_trips"], 1)             # dispatched
        self.assertEqual(d["pending_trips"], 1)            # draft
        self.assertEqual(d["drivers_on_duty"], 1)          # Alex

    # -- 3. Fleet utilization formula: on_trip / total_active × 100 ---------
    def test_fleet_utilization_formula(self):
        r = self.get()
        # 1 on-trip out of 3 active = 33.33 %
        self.assertAlmostEqual(float(r.data["fleet_utilization_pct"]), 33.33, places=1)

    def test_fleet_utilization_zero_when_no_active_vehicles(self):
        Trip.objects.all().delete()
        Vehicle.objects.all().delete()
        r = self.get()
        self.assertEqual(r.data["fleet_utilization_pct"], 0)

    # -- 4. ?type= filter ----------------------------------------------------
    def test_type_filter_vans_only(self):
        r = self.get("?type=Van")
        d = r.data
        # active vans (non-retired): VAN-01, VAN-02
        self.assertEqual(d["active_vehicles"], 2)
        self.assertEqual(d["available_vehicles"], 1)       # VAN-01
        self.assertEqual(d["vehicles_in_maintenance"], 0)  # no vans in shop

    def test_type_filter_truck_only(self):
        r = self.get("?type=Truck")
        d = r.data
        self.assertEqual(d["active_vehicles"], 1)          # TRK-01
        self.assertEqual(d["vehicles_in_maintenance"], 1)  # TRK-01 is IN_SHOP

    def test_type_filter_case_insensitive(self):
        r_lower = self.get("?type=van")
        r_upper = self.get("?type=VAN")
        self.assertEqual(r_lower.data["active_vehicles"], r_upper.data["active_vehicles"])

    # -- 5. ?region= filter --------------------------------------------------
    def test_region_filter_north(self):
        r = self.get("?region=North")
        d = r.data
        # North non-retired: VAN-01 (Available), VAN-02 (On Trip)
        self.assertEqual(d["active_vehicles"], 2)

    def test_region_filter_south(self):
        r = self.get("?region=South")
        d = r.data
        # South: TRK-01 only
        self.assertEqual(d["active_vehicles"], 1)
        self.assertEqual(d["vehicles_in_maintenance"], 1)

    def test_region_filter_case_insensitive(self):
        r_lower = self.get("?region=north")
        r_upper = self.get("?region=North")
        self.assertEqual(r_lower.data["active_vehicles"], r_upper.data["active_vehicles"])

    # -- 6. ?status= filter --------------------------------------------------
    def test_status_filter_available(self):
        r = self.get("?status=AVAILABLE")
        d = r.data
        self.assertEqual(d["active_vehicles"], 1)   # VAN-01
        self.assertEqual(d["available_vehicles"], 1)

    def test_status_filter_on_trip(self):
        r = self.get("?status=ON_TRIP")
        d = r.data
        self.assertEqual(d["active_vehicles"], 1)   # VAN-02
        self.assertEqual(d["fleet_utilization_pct"], 100.0)

    # -- 7. Scoped trip counts when filter active ----------------------------
    def test_trip_counts_scoped_to_filtered_vehicles(self):
        # Filter to only South (TRK-01) — no trips belong to it
        r = self.get("?region=South")
        self.assertEqual(r.data["active_trips"], 0)
        self.assertEqual(r.data["pending_trips"], 0)

    def test_trip_counts_scoped_to_van_type(self):
        # VAN-02 has the dispatched trip, VAN-01 has the draft trip
        r = self.get("?type=Van")
        self.assertEqual(r.data["active_trips"], 1)
        self.assertEqual(r.data["pending_trips"], 1)

    # -- 8. drivers_on_duty is never filtered (no region on Driver) ----------
    def test_drivers_on_duty_always_fleet_wide(self):
        # Even when filtering to South (TRK-01), Alex (On Trip) still counted
        r = self.get("?region=South")
        self.assertEqual(r.data["drivers_on_duty"], 1)

    # -- 9. Combined filters -------------------------------------------------
    def test_combined_type_and_region_filter(self):
        r = self.get("?type=Van&region=North")
        # VAN-01 + VAN-02 both match
        self.assertEqual(r.data["active_vehicles"], 2)

    def test_combined_no_match_returns_zeros(self):
        r = self.get("?type=Truck&region=North")
        # No truck in North
        self.assertEqual(r.data["active_vehicles"], 0)
        self.assertEqual(r.data["fleet_utilization_pct"], 0)
