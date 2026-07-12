import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Driver, Trip, Vehicle
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Driver, Expense, FuelLog, MaintenanceLog, Trip, Vehicle

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
class TripEngineTests(TestCase):
    def setUp(self):
        self.vehicle = Vehicle.objects.create(
            registration_number="VAN-05",
            name_model="Van-05",
            type="Van",
            max_load_capacity=500.0,
            odometer=12000.0,
            acquisition_cost=25000.0,
            status=Vehicle.Status.AVAILABLE,
        )
        self.driver = Driver.objects.create(
            name="Alex",
            license_number="LIC-ALEX-001",
            license_category="LMV",
            license_expiry_date=datetime.date.today() + datetime.timedelta(days=365),
            status=Driver.Status.AVAILABLE,
        )

    def test_successful_dispatch_and_completion(self):
        # 1. Create a draft trip
        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )

        # 2. Dispatch
        trip.dispatch()
        self.assertEqual(trip.status, Trip.Status.DISPATCHED)
        self.assertEqual(trip.vehicle.status, Vehicle.Status.ON_TRIP)
        self.assertEqual(trip.driver.status, Driver.Status.ON_TRIP)

        # 3. Complete
        trip.complete(final_odometer=12100.0, fuel_consumed=65.50)
        self.assertEqual(trip.status, Trip.Status.COMPLETED)
        self.assertEqual(trip.vehicle.status, Vehicle.Status.AVAILABLE)
        self.assertEqual(trip.driver.status, Driver.Status.AVAILABLE)
        self.assertEqual(trip.final_odometer, 12100.0)
        self.assertEqual(trip.fuel_consumed, 65.50)

    def test_overload_prevention(self):
        # Create an overloaded trip (550kg cargo for 500kg capacity)
        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=550.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.dispatch()

    def test_expired_license_prevention(self):
        # Driver with expired license
        self.driver.license_expiry_date = datetime.date.today() - datetime.timedelta(days=1)
        self.driver.save()

        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.dispatch()

    def test_busy_vehicle_prevention(self):
        self.vehicle.status = Vehicle.Status.ON_TRIP
        self.vehicle.save()

        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.dispatch()

    def test_busy_driver_prevention(self):
        self.driver.status = Driver.Status.ON_TRIP
        self.driver.save()

        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.dispatch()

    def test_suspended_driver_prevention(self):
        self.driver.status = Driver.Status.SUSPENDED
        self.driver.save()

        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.dispatch()

    def test_vehicle_in_shop_dispatch_prevention(self):
        self.vehicle.status = Vehicle.Status.IN_SHOP
        self.vehicle.save()

        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.dispatch()

    def test_driver_off_duty_dispatch_prevention(self):
        self.driver.status = Driver.Status.OFF_DUTY
        self.driver.save()

        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.dispatch()

    def test_dispatch_non_draft_prevention(self):
        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.COMPLETED,
        )
        with self.assertRaises(ValueError):
            trip.dispatch()

    def test_complete_non_dispatched_prevention(self):
        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.complete(final_odometer=12100.0, fuel_consumed=20.0)

    def test_cancel_non_dispatched_prevention(self):
        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        with self.assertRaises(ValueError):
            trip.cancel()


class ReportsViewTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin@transitops.dev",
            email="admin@transitops.dev",
            password="admin1234",
            role=User.Role.FLEET_MANAGER,
        )
        self.client.force_authenticate(user=self.admin)

        self.vehicle = Vehicle.objects.create(
            registration_number="VAN-05",
            name_model="Van-05",
            type="Van",
            max_load_capacity=500.0,
            odometer=12000.0,
            acquisition_cost=25000.0,
            status=Vehicle.Status.AVAILABLE,
        )
        self.driver = Driver.objects.create(
            name="Alex",
            license_number="LIC-ALEX-001",
            license_category="LMV",
            license_expiry_date=datetime.date.today() + datetime.timedelta(days=365),
            status=Driver.Status.AVAILABLE,
        )

    def test_reports_calculations(self):
        # Create a completed trip of 100 km
        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        trip.dispatch()
        trip.complete(final_odometer=12100.0, fuel_consumed=20.0)

        # Log fuel cost: 65.50
        FuelLog.objects.create(
            vehicle=self.vehicle,
            liters=20.0,
            cost=65.50,
            date=datetime.date.today(),
        )

        # Log non-maintenance expense: Toll cost = 12.75
        Expense.objects.create(
            vehicle=self.vehicle,
            type=Expense.Type.TOLL,
            amount=12.75,
            date=datetime.date.today(),
        )

        # Log maintenance expense: cost = 50.00 (via maintenance log)
        log = MaintenanceLog.objects.create(
            vehicle=self.vehicle,
            description="Oil Change",
            cost=50.00,
        )
        log.close()

        # Log maintenance-type Expense (to verify it is excluded from op_cost calculation to avoid double-counting)
        Expense.objects.create(
            vehicle=self.vehicle,
            type=Expense.Type.MAINTENANCE,
            amount=50.00,
            date=datetime.date.today(),
        )

        # Request reports
        url = reverse("reports")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Expected results:
        # Distance = 100
        # Fuel efficiency = 100 / 20 = 5.0
        # Op cost = Fuel cost (65.50) + Maintenance (50.00) + Toll (12.75) = 128.25
        # (MAINTENANCE expense type should be ignored to avoid double counting)
        # Revenue = 100 * 3 = 300.0
        # ROI = (300.0 - 128.25) / 25000 = 171.75 / 25000 = 0.00687
        
        data = response.data[0]
        self.assertEqual(data["vehicle"], "VAN-05")
        self.assertEqual(data["fuel_efficiency"], 5.0)
        self.assertEqual(data["operational_cost"], 128.25)
        self.assertEqual(data["roi"], 0.0069)

    def test_reports_csv_export(self):
        # Create a completed trip
        trip = Trip.objects.create(
            source="A",
            destination="B",
            vehicle=self.vehicle,
            driver=self.driver,
            cargo_weight=450.0,
            planned_distance=100.0,
            status=Trip.Status.DRAFT,
        )
        trip.dispatch()
        trip.complete(final_odometer=12100.0, fuel_consumed=20.0)

        # Log fuel cost: 65.50
        FuelLog.objects.create(
            vehicle=self.vehicle,
            liters=20.0,
            cost=65.50,
            date=datetime.date.today(),
        )

        url = reverse("reports-csv")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn(b"Vehicle,Fuel Efficiency,Operational Cost,ROI", response.content)
        self.assertIn(b"VAN-05", response.content)


# ---------------------------------------------------------------------------
# Hour 5 — Reports edge-case tests
# ---------------------------------------------------------------------------

class ReportsEdgeCaseTests(APITestCase):
    """Edge cases for /api/reports/ and /api/reports/export/csv/."""

    def setUp(self):
        user = User.objects.create_user(
            username="edge@test.com", email="edge@test.com",
            password="pass", role=User.Role.FLEET_MANAGER,
        )
        self.client.force_authenticate(user=user)

        self.vehicle = Vehicle.objects.create(
            registration_number="VAN-EDGE",
            name_model="Edge Van",
            type="Van",
            max_load_capacity=1000,
            odometer=0,
            acquisition_cost=50000,
            status=Vehicle.Status.AVAILABLE,
        )
        self.driver = Driver.objects.create(
            name="EdgeDriver",
            license_number="LIC-EDGE",
            license_category="LMV",
            license_expiry_date=datetime.date.today() + datetime.timedelta(days=365),
            status=Driver.Status.AVAILABLE,
        )

    def _completed_trip(self, distance=100):
        t = Trip.objects.create(
            source="X", destination="Y",
            vehicle=self.vehicle, driver=self.driver,
            cargo_weight=100, planned_distance=distance,
            status=Trip.Status.DRAFT,
        )
        t.dispatch()
        t.complete(final_odometer=distance, fuel_consumed=10)
        return t

    def _get_report_row(self):
        r = self.client.get(reverse("reports"))
        self.assertEqual(r.status_code, 200)
        return next(row for row in r.data if row["vehicle"] == "VAN-EDGE")

    # -- 1. No fuel logged → fuel_efficiency = 0, no division-by-zero -------
    def test_fuel_efficiency_zero_when_no_fuel_logged(self):
        self._completed_trip()
        row = self._get_report_row()
        self.assertEqual(row["fuel_efficiency"], 0.0)

    # -- 2. Fuel logged but no completed trips → distance = 0 ----------------
    def test_fuel_efficiency_zero_when_no_completed_trips(self):
        FuelLog.objects.create(vehicle=self.vehicle, liters=10, cost=50,
                               date=datetime.date.today())
        row = self._get_report_row()
        self.assertEqual(row["fuel_efficiency"], 0.0)

    # -- 3. Fuel efficiency computed correctly --------------------------------
    def test_fuel_efficiency_calculation(self):
        self._completed_trip(distance=200)
        FuelLog.objects.create(vehicle=self.vehicle, liters=10, cost=50,
                               date=datetime.date.today())
        row = self._get_report_row()
        # 200 km / 10 L = 20.0
        self.assertEqual(row["fuel_efficiency"], 20.0)

    # -- 4. MAINTENANCE-type expense excluded from op_cost -------------------
    def test_maintenance_expense_type_excluded_from_op_cost(self):
        # Add a MAINTENANCE-type expense (should be ignored)
        Expense.objects.create(vehicle=self.vehicle, type=Expense.Type.MAINTENANCE,
                               amount=999, date=datetime.date.today())
        # Add a TOLL expense (should be included)
        Expense.objects.create(vehicle=self.vehicle, type=Expense.Type.TOLL,
                               amount=25, date=datetime.date.today())
        row = self._get_report_row()
        # op_cost = 0 (no fuel/maintenance) + 25 (toll) = 25
        self.assertEqual(row["operational_cost"], 25.0)

    # -- 5. Operational cost aggregates fuel + maintenance + other -----------
    def test_operational_cost_full_aggregation(self):
        FuelLog.objects.create(vehicle=self.vehicle, liters=10, cost=65.50,
                               date=datetime.date.today())
        Expense.objects.create(vehicle=self.vehicle, type=Expense.Type.TOLL,
                               amount=12.75, date=datetime.date.today())
        m = MaintenanceLog.objects.create(vehicle=self.vehicle,
                                          description="Oil Change", cost=50.00)
        m.close()
        row = self._get_report_row()
        self.assertAlmostEqual(row["operational_cost"], 128.25, places=2)

    # -- 6. ROI = 0 when acquisition_cost = 0 (division-by-zero guard) ------
    def test_roi_zero_when_acquisition_cost_is_zero(self):
        self.vehicle.acquisition_cost = 0
        self.vehicle.save()
        row = self._get_report_row()
        self.assertEqual(row["roi"], 0.0)

    # -- 7. Only COMPLETED trips count toward distance + revenue -------------
    def test_only_completed_trips_count(self):
        # Draft trip — should NOT be counted
        Trip.objects.create(
            source="A", destination="B", vehicle=self.vehicle, driver=self.driver,
            cargo_weight=50, planned_distance=500, status=Trip.Status.DRAFT,
        )
        FuelLog.objects.create(vehicle=self.vehicle, liters=10, cost=50,
                               date=datetime.date.today())
        row = self._get_report_row()
        # No completed trips → distance = 0 → fuel_efficiency = 0
        self.assertEqual(row["fuel_efficiency"], 0.0)

    # -- 8. Cancelled (dispatched→cancelled) trips don't count ---------------
    def test_cancelled_trip_does_not_count(self):
        t = Trip.objects.create(
            source="A", destination="B", vehicle=self.vehicle, driver=self.driver,
            cargo_weight=50, planned_distance=300, status=Trip.Status.DRAFT,
        )
        t.dispatch()
        t.cancel()
        FuelLog.objects.create(vehicle=self.vehicle, liters=10, cost=50,
                               date=datetime.date.today())
        row = self._get_report_row()
        self.assertEqual(row["fuel_efficiency"], 0.0)

    # -- 9. Multiple completed trips aggregate correctly ----------------------
    def test_multiple_trips_aggregate(self):
        self._completed_trip(distance=100)
        # Reset driver status so second trip can be dispatched
        self.driver.status = Driver.Status.AVAILABLE
        self.driver.save()
        self.vehicle.status = Vehicle.Status.AVAILABLE
        self.vehicle.save()
        self._completed_trip(distance=200)
        FuelLog.objects.create(vehicle=self.vehicle, liters=10, cost=50,
                               date=datetime.date.today())
        row = self._get_report_row()
        # distance = 100 + 200 = 300, fuel = 10 → 30.0
        self.assertEqual(row["fuel_efficiency"], 30.0)

    # -- 10. Revenue = planned_distance × 3 per completed trip ---------------
    def test_revenue_based_on_completed_distance(self):
        self._completed_trip(distance=100)   # revenue = 300
        row = self._get_report_row()
        # op_cost = 0, revenue = 300, acquisition_cost = 50000
        expected_roi = round((300 - 0) / 50000, 4)
        self.assertEqual(row["roi"], expected_roi)

    # -- 11. Empty fleet returns empty list ----------------------------------
    def test_empty_fleet_returns_empty_list(self):
        Vehicle.objects.all().delete()
        r = self.client.get(reverse("reports"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, [])

    # -- 12. CSV content-type and content-disposition headers ----------------
    def test_csv_headers(self):
        r = self.client.get(reverse("reports-csv"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r["Content-Type"], "text/csv")
        self.assertIn('attachment', r["Content-Disposition"])
        self.assertIn('reports.csv', r["Content-Disposition"])

    # -- 13. CSV first row is the header row ---------------------------------
    def test_csv_first_row_is_header(self):
        r = self.client.get(reverse("reports-csv"))
        lines = r.content.decode().strip().splitlines()
        self.assertEqual(lines[0].strip(), "Vehicle,Fuel Efficiency,Operational Cost,ROI")

    # -- 14. CSV data rows match JSON report values --------------------------
    def test_csv_values_match_json(self):
        self._completed_trip(distance=100)
        FuelLog.objects.create(vehicle=self.vehicle, liters=10, cost=50,
                               date=datetime.date.today())

        json_row = self._get_report_row()
        csv_r = self.client.get(reverse("reports-csv"))
        lines = [l.strip() for l in csv_r.content.decode().strip().splitlines()]
        csv_row = next(l for l in lines if "VAN-EDGE" in l)
        parts = csv_row.split(",")

        self.assertEqual(parts[0], "VAN-EDGE")
        self.assertAlmostEqual(float(parts[1]), json_row["fuel_efficiency"], places=2)
        self.assertAlmostEqual(float(parts[2]), json_row["operational_cost"], places=2)
        self.assertAlmostEqual(float(parts[3]), json_row["roi"], places=4)


# ---------------------------------------------------------------------------
# Hour 6 — List Filters edge-case tests
# ---------------------------------------------------------------------------

class Hour6FilterTests(APITestCase):
    def setUp(self):
        user = User.objects.create_user(
            username="filtertest@test.com", email="filtertest@test.com",
            password="pass", role=User.Role.FLEET_MANAGER,
        )
        self.client.force_authenticate(user=user)

        self.v1 = Vehicle.objects.create(
            registration_number="V-1", name_model="Model-1", type="Van",
            max_load_capacity=1000, odometer=0, acquisition_cost=50000,
            status=Vehicle.Status.AVAILABLE,
        )
        self.v2 = Vehicle.objects.create(
            registration_number="V-2", name_model="Model-2", type="Truck",
            max_load_capacity=2000, odometer=0, acquisition_cost=80000,
            status=Vehicle.Status.AVAILABLE,
        )

    # -- MaintenanceLog Filters --
    def test_maintenance_filter_by_vehicle(self):
        m1 = MaintenanceLog.objects.create(vehicle=self.v1, description="Fix 1", cost=10)
        m2 = MaintenanceLog.objects.create(vehicle=self.v2, description="Fix 2", cost=20)
        
        r = self.client.get(f"/api/maintenance/?vehicle={self.v1.id}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], m1.id)

    def test_maintenance_filter_by_status(self):
        m1 = MaintenanceLog.objects.create(vehicle=self.v1, description="Fix 1", cost=10)
        m2 = MaintenanceLog.objects.create(vehicle=self.v2, description="Fix 2", cost=20)
        m1.close()  # m1 is CLOSED, m2 is OPEN
        
        r = self.client.get("/api/maintenance/?status=OPEN")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], m2.id)

    def test_maintenance_combined_filter(self):
        m1 = MaintenanceLog.objects.create(vehicle=self.v1, description="Fix 1", cost=10)
        m2 = MaintenanceLog.objects.create(vehicle=self.v1, description="Fix 2", cost=20)
        m3 = MaintenanceLog.objects.create(vehicle=self.v2, description="Fix 3", cost=30)
        m1.close()
        
        r = self.client.get(f"/api/maintenance/?vehicle={self.v1.id}&status=OPEN")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], m2.id)

    def test_maintenance_no_match(self):
        m1 = MaintenanceLog.objects.create(vehicle=self.v1, description="Fix 1", cost=10)
        r = self.client.get("/api/maintenance/?status=CLOSED")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 0)

    # -- FuelLog Filters --
    def test_fuel_log_filter_by_vehicle(self):
        f1 = FuelLog.objects.create(vehicle=self.v1, liters=10, cost=50, date="2026-07-12")
        f2 = FuelLog.objects.create(vehicle=self.v2, liters=20, cost=100, date="2026-07-12")
        
        r = self.client.get(f"/api/fuel-logs/?vehicle={self.v1.id}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], f1.id)

    def test_fuel_log_filter_by_date(self):
        f1 = FuelLog.objects.create(vehicle=self.v1, liters=10, cost=50, date="2026-07-11")
        f2 = FuelLog.objects.create(vehicle=self.v2, liters=20, cost=100, date="2026-07-12")
        
        r = self.client.get("/api/fuel-logs/?date=2026-07-12")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], f2.id)

    def test_fuel_log_combined_filter(self):
        f1 = FuelLog.objects.create(vehicle=self.v1, liters=10, cost=50, date="2026-07-11")
        f2 = FuelLog.objects.create(vehicle=self.v1, liters=20, cost=100, date="2026-07-12")
        f3 = FuelLog.objects.create(vehicle=self.v2, liters=30, cost=150, date="2026-07-12")
        
        r = self.client.get(f"/api/fuel-logs/?vehicle={self.v1.id}&date=2026-07-12")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], f2.id)

    # -- Expense Filters --
    def test_expense_filter_by_vehicle(self):
        e1 = Expense.objects.create(vehicle=self.v1, type=Expense.Type.TOLL, amount=10, date="2026-07-12")
        e2 = Expense.objects.create(vehicle=self.v2, type=Expense.Type.OTHER, amount=20, date="2026-07-12")
        
        r = self.client.get(f"/api/expenses/?vehicle={self.v1.id}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], e1.id)

    def test_expense_filter_by_type(self):
        e1 = Expense.objects.create(vehicle=self.v1, type=Expense.Type.TOLL, amount=10, date="2026-07-12")
        e2 = Expense.objects.create(vehicle=self.v2, type=Expense.Type.OTHER, amount=20, date="2026-07-12")
        
        r = self.client.get("/api/expenses/?type=TOLL")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], e1.id)

    def test_expense_combined_filter(self):
        e1 = Expense.objects.create(vehicle=self.v1, type=Expense.Type.TOLL, amount=10, date="2026-07-12")
        e2 = Expense.objects.create(vehicle=self.v1, type=Expense.Type.OTHER, amount=20, date="2026-07-12")
        e3 = Expense.objects.create(vehicle=self.v2, type=Expense.Type.TOLL, amount=30, date="2026-07-12")
        
        r = self.client.get(f"/api/expenses/?vehicle={self.v1.id}&type=TOLL")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["id"], e1.id)

    def test_expense_no_match(self):
        e1 = Expense.objects.create(vehicle=self.v1, type=Expense.Type.TOLL, amount=10, date="2026-07-12")
        r = self.client.get("/api/expenses/?type=MAINTENANCE")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 0)
