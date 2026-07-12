from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        FLEET_MANAGER = "FLEET_MANAGER", "Fleet Manager"
        DRIVER = "DRIVER", "Driver"
        SAFETY_OFFICER = "SAFETY_OFFICER", "Safety Officer"
        FINANCIAL_ANALYST = "FINANCIAL_ANALYST", "Financial Analyst"

    role = models.CharField(max_length=32, choices=Role.choices, default=Role.FLEET_MANAGER)


class Vehicle(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        ON_TRIP = "ON_TRIP", "On Trip"
        IN_SHOP = "IN_SHOP", "In Shop"
        RETIRED = "RETIRED", "Retired"

    registration_number = models.CharField(max_length=32, unique=True)
    name_model = models.CharField(max_length=128)
    type = models.CharField(max_length=64)
    max_load_capacity = models.DecimalField(max_digits=10, decimal_places=2)
    odometer = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    acquisition_cost = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)
    region = models.CharField(max_length=64, blank=True)

    def __str__(self):
        return self.registration_number


class Driver(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Available"
        ON_TRIP = "ON_TRIP", "On Trip"
        OFF_DUTY = "OFF_DUTY", "Off Duty"
        SUSPENDED = "SUSPENDED", "Suspended"

    name = models.CharField(max_length=128)
    license_number = models.CharField(max_length=64, unique=True)
    license_category = models.CharField(max_length=32)
    license_expiry_date = models.DateField()
    contact_number = models.CharField(max_length=32, blank=True)
    safety_score = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)

    def __str__(self):
        return self.name


class Trip(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        DISPATCHED = "DISPATCHED", "Dispatched"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    source = models.CharField(max_length=128)
    destination = models.CharField(max_length=128)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="trips")
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name="trips")
    cargo_weight = models.DecimalField(max_digits=10, decimal_places=2)
    planned_distance = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    final_odometer = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fuel_consumed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # --- Rule engine -------------------------------------------------
    def dispatch(self):
        import datetime
        if self.status != Trip.Status.DRAFT:
            raise ValueError("Only Draft trips can be dispatched.")
        if self.vehicle.status != Vehicle.Status.AVAILABLE:
            raise ValueError("Vehicle is not available.")
        if self.driver.status != Driver.Status.AVAILABLE:
            raise ValueError("Driver is not available.")
        if self.driver.license_expiry_date < datetime.date.today():
            raise ValueError("Driver license has expired.")
        if self.cargo_weight > self.vehicle.max_load_capacity:
            raise ValueError("Cargo weight exceeds vehicle max load capacity.")

        self.vehicle.status = Vehicle.Status.ON_TRIP
        self.driver.status = Driver.Status.ON_TRIP
        self.status = Trip.Status.DISPATCHED
        self.vehicle.save()
        self.driver.save()
        self.save()

    def complete(self, final_odometer, fuel_consumed):
        if self.status != Trip.Status.DISPATCHED:
            raise ValueError("Only Dispatched trips can be completed.")
        self.final_odometer = final_odometer
        self.fuel_consumed = fuel_consumed
        self.status = Trip.Status.COMPLETED
        self.vehicle.status = Vehicle.Status.AVAILABLE
        self.driver.status = Driver.Status.AVAILABLE
        self.vehicle.save()
        self.driver.save()
        self.save()

    def cancel(self):
        if self.status != Trip.Status.DISPATCHED:
            raise ValueError("Only Dispatched trips can be cancelled.")
        self.status = Trip.Status.CANCELLED
        self.vehicle.status = Vehicle.Status.AVAILABLE
        self.driver.status = Driver.Status.AVAILABLE
        self.vehicle.save()
        self.driver.save()
        self.save()


class MaintenanceLog(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="maintenance_logs")
    description = models.CharField(max_length=255)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date_opened = models.DateField(auto_now_add=True)
    date_closed = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)

    def save(self, *args, **kwargs):
        creating = self._state.adding
        super().save(*args, **kwargs)
        if creating and self.status == MaintenanceLog.Status.OPEN:
            self.vehicle.status = Vehicle.Status.IN_SHOP
            self.vehicle.save()

    def close(self):
        import datetime
        self.status = MaintenanceLog.Status.CLOSED
        self.date_closed = datetime.date.today()
        if self.vehicle.status != Vehicle.Status.RETIRED:
            self.vehicle.status = Vehicle.Status.AVAILABLE
            self.vehicle.save()
        self.save()


class FuelLog(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuel_logs")
    liters = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()


class Expense(models.Model):
    class Type(models.TextChoices):
        TOLL = "TOLL", "Toll"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        OTHER = "OTHER", "Other"

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="expenses")
    type = models.CharField(max_length=16, choices=Type.choices, default=Type.OTHER)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
