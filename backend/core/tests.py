import datetime
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Driver, Expense, FuelLog, MaintenanceLog, Trip, Vehicle

User = get_user_model()


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

