import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import Driver, Vehicle

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with demo data (Van-05 / Alex scenario + a couple extras)."

    def handle(self, *args, **options):
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(username="admin", email="admin@transitops.dev", password="admin1234")
            self.stdout.write(self.style.SUCCESS("Created admin user (admin / admin1234)"))

        Vehicle.objects.get_or_create(
            registration_number="VAN-05",
            defaults=dict(
                name_model="Van-05",
                type="Van",
                max_load_capacity=500,
                odometer=12000,
                acquisition_cost=25000,
                status=Vehicle.Status.AVAILABLE,
                region="North",
            ),
        )
        Vehicle.objects.get_or_create(
            registration_number="TRK-11",
            defaults=dict(
                name_model="Truck-11",
                type="Truck",
                max_load_capacity=2000,
                odometer=45000,
                acquisition_cost=60000,
                status=Vehicle.Status.AVAILABLE,
                region="South",
            ),
        )

        Driver.objects.get_or_create(
            license_number="LIC-ALEX-001",
            defaults=dict(
                name="Alex",
                license_category="LMV",
                license_expiry_date=datetime.date.today() + datetime.timedelta(days=365),
                contact_number="+1-555-0100",
                status=Driver.Status.AVAILABLE,
            ),
        )
        Driver.objects.get_or_create(
            license_number="LIC-SAM-002",
            defaults=dict(
                name="Sam",
                license_category="HMV",
                license_expiry_date=datetime.date.today() + datetime.timedelta(days=200),
                contact_number="+1-555-0101",
                status=Driver.Status.AVAILABLE,
            ),
        )

        self.stdout.write(self.style.SUCCESS("Seed complete."))
