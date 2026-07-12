import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Driver, Vehicle, Trip, MaintenanceLog, FuelLog, Expense

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with comprehensive demo data."

    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Create Users
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(username="admin", email="admin@transitops.dev", password="admin1234")
            self.stdout.write(self.style.SUCCESS("Created admin user (admin / admin1234)"))
        
        # 2. Create Vehicles
        v1, _ = Vehicle.objects.get_or_create(
            registration_number="VAN-05",
            defaults=dict(
                name_model="Transit Van",
                type="Van",
                max_load_capacity=500.00,
                odometer=12000.00,
                acquisition_cost=25000.00,
                status=Vehicle.Status.AVAILABLE,
                region="North",
            ),
        )
        v2, _ = Vehicle.objects.get_or_create(
            registration_number="TRK-11",
            defaults=dict(
                name_model="Heavy Truck",
                type="Truck",
                max_load_capacity=2000.00,
                odometer=45000.00,
                acquisition_cost=60000.00,
                status=Vehicle.Status.AVAILABLE,
                region="South",
            ),
        )
        v3, _ = Vehicle.objects.get_or_create(
            registration_number="SUV-02",
            defaults=dict(
                name_model="Scout SUV",
                type="SUV",
                max_load_capacity=300.00,
                odometer=8000.00,
                acquisition_cost=30000.00,
                status=Vehicle.Status.AVAILABLE,
                region="East",
            ),
        )

        # 3. Create Drivers
        d1, _ = Driver.objects.get_or_create(
            license_number="LIC-ALEX-001",
            defaults=dict(
                name="Alex",
                license_category="LMV",
                license_expiry_date=datetime.date.today() + datetime.timedelta(days=365),
                contact_number="+1-555-0100",
                status=Driver.Status.AVAILABLE,
                safety_score=95.0,
            ),
        )
        d2, _ = Driver.objects.get_or_create(
            license_number="LIC-SAM-002",
            defaults=dict(
                name="Sam",
                license_category="HMV",
                license_expiry_date=datetime.date.today() + datetime.timedelta(days=200),
                contact_number="+1-555-0101",
                status=Driver.Status.AVAILABLE,
                safety_score=88.5,
            ),
        )
        d3, _ = Driver.objects.get_or_create(
            license_number="LIC-TAYLOR-003",
            defaults=dict(
                name="Taylor",
                license_category="LMV",
                license_expiry_date=datetime.date.today() + datetime.timedelta(days=150),
                contact_number="+1-555-0102",
                status=Driver.Status.AVAILABLE,
                safety_score=92.0,
            ),
        )

        # 4. Create Trips
        t1, created_t1 = Trip.objects.get_or_create(
            source="Warehouse A",
            destination="Store 12",
            vehicle=v1,
            driver=d1,
            defaults=dict(
                cargo_weight=300.00,
                planned_distance=50.00,
                status=Trip.Status.DRAFT
            )
        )
        if created_t1:
            t1.dispatch()
            t1.complete(final_odometer=Decimal(str(v1.odometer)) + Decimal('55.0'), fuel_consumed=Decimal('10.5'))

        t2, created_t2 = Trip.objects.get_or_create(
            source="Port B",
            destination="Depot C",
            vehicle=v2,
            driver=d2,
            defaults=dict(
                cargo_weight=1500.00,
                planned_distance=200.00,
                status=Trip.Status.DRAFT
            )
        )
        if created_t2:
            t2.dispatch()
        
        t3, created_t3 = Trip.objects.get_or_create(
            source="HQ",
            destination="Client Office",
            vehicle=v3,
            driver=d3,
            defaults=dict(
                cargo_weight=100.00,
                planned_distance=20.00,
                status=Trip.Status.DRAFT
            )
        )
        
        # 5. Create Maintenance Logs
        MaintenanceLog.objects.get_or_create(
            vehicle=v1,
            description="Routine oil change",
            defaults=dict(
                cost=120.00,
                status=MaintenanceLog.Status.CLOSED,
                date_closed=datetime.date.today() - datetime.timedelta(days=10)
            )
        )
        MaintenanceLog.objects.get_or_create(
            vehicle=v3,
            description="Tire alignment",
            defaults=dict(
                cost=80.00,
                status=MaintenanceLog.Status.OPEN
            )
        )

        # 6. Create Fuel Logs
        FuelLog.objects.get_or_create(
            vehicle=v1,
            date=datetime.date.today() - datetime.timedelta(days=2),
            defaults=dict(
                liters=40.00,
                cost=65.00
            )
        )
        FuelLog.objects.get_or_create(
            vehicle=v2,
            date=datetime.date.today() - datetime.timedelta(days=1),
            defaults=dict(
                liters=150.00,
                cost=230.00
            )
        )

        # 7. Create Expenses
        Expense.objects.get_or_create(
            vehicle=v2,
            date=datetime.date.today() - datetime.timedelta(days=1),
            defaults=dict(
                type=Expense.Type.TOLL,
                amount=15.00
            )
        )
        Expense.objects.get_or_create(
            vehicle=v1,
            date=datetime.date.today() - datetime.timedelta(days=12),
            defaults=dict(
                type=Expense.Type.MAINTENANCE,
                amount=120.00
            )
        )

        self.stdout.write(self.style.SUCCESS("Comprehensive seed complete."))
