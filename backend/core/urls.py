from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = DefaultRouter()
router.register(r"vehicles", views.VehicleViewSet, basename="vehicle")
router.register(r"drivers", views.DriverViewSet, basename="driver")
router.register(r"trips", views.TripViewSet, basename="trip")
router.register(r"maintenance", views.MaintenanceLogViewSet, basename="maintenance")
router.register(r"fuel-logs", views.FuelLogViewSet, basename="fuel-log")
router.register(r"expenses", views.ExpenseViewSet, basename="expense")

urlpatterns = [
    path("auth/signup/", views.SignupView.as_view(), name="signup"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("reports/", views.ReportsView.as_view(), name="reports"),
    path("reports/export/csv/", views.ReportsCSVExportView.as_view(), name="reports-csv"),
    path("", include(router.urls)),
]
