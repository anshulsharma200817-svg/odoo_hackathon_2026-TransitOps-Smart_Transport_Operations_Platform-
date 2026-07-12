from django.contrib import admin

from .models import Driver, Expense, FuelLog, MaintenanceLog, Trip, Vehicle

admin.site.register(Vehicle)
admin.site.register(Driver)
admin.site.register(Trip)
admin.site.register(MaintenanceLog)
admin.site.register(FuelLog)
admin.site.register(Expense)
