from django.db.models import Count, Q
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Driver, Expense, FuelLog, MaintenanceLog, Trip, Vehicle
from .serializers import (
    DriverSerializer,
    ExpenseSerializer,
    FuelLogSerializer,
    MaintenanceLogSerializer,
    TripCompleteSerializer,
    TripSerializer,
    UserSerializer,
    VehicleSerializer,
)
from .permissions import IsFleetManager, IsFleetManagerOrDriver


# ---- Auth --------------------------------------------------------------

class SignupView(generics.CreateAPIView):
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.create_user(
            username=request.data["email"],
            email=request.data["email"],
            password=request.data["password"],
            role=request.data.get("role", User.Role.FLEET_MANAGER),
        )
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    pass


# ---- Vehicles ------------------------------------------------------------

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "type", "region"]

    @action(detail=False, methods=["get"])
    def available(self, request):
        qs = self.get_queryset().filter(status=Vehicle.Status.AVAILABLE)
        return Response(VehicleSerializer(qs, many=True).data)


# ---- Drivers ---------------------------------------------------------------

class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]

    @action(detail=False, methods=["get"])
    def available(self, request):
        import datetime

        qs = self.get_queryset().filter(
            status=Driver.Status.AVAILABLE,
            license_expiry_date__gte=datetime.date.today(),
        )
        return Response(DriverSerializer(qs, many=True).data)


# ---- Trips -------------------------------------------------------------

class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]

    def get_permissions(self):
        if self.action in ["dispatch", "cancel"]:
            return [IsAuthenticated(), IsFleetManager()]
        elif self.action == "complete":
            return [IsAuthenticated(), IsFleetManagerOrDriver()]
        return super().get_permissions()

    @action(detail=True, methods=["post"])
    def dispatch(self, request, pk=None):
        trip = self.get_object()
        try:
            trip.dispatch()
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        trip = self.get_object()
        serializer = TripCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            trip.complete(**serializer.validated_data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        trip = self.get_object()
        try:
            trip.cancel()
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TripSerializer(trip).data)


# ---- Maintenance -----------------------------------------------------------

class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        log = self.get_object()
        log.close()
        return Response(MaintenanceLogSerializer(log).data)


# ---- Fuel & Expenses ----------------------------------------------------

class FuelLogViewSet(viewsets.ModelViewSet):
    queryset = FuelLog.objects.all()
    serializer_class = FuelLogSerializer
    permission_classes = [IsAuthenticated]


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]


# ---- Dashboard & Reports --------------------------------------------------

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vehicles = Vehicle.objects.exclude(status=Vehicle.Status.RETIRED)
        total_active = vehicles.count()
        on_trip = vehicles.filter(status=Vehicle.Status.ON_TRIP).count()
        utilization = (on_trip / total_active * 100) if total_active else 0

        data = {
            "active_vehicles": total_active,
            "available_vehicles": vehicles.filter(status=Vehicle.Status.AVAILABLE).count(),
            "vehicles_in_maintenance": vehicles.filter(status=Vehicle.Status.IN_SHOP).count(),
            "active_trips": Trip.objects.filter(status=Trip.Status.DISPATCHED).count(),
            "pending_trips": Trip.objects.filter(status=Trip.Status.DRAFT).count(),
            "drivers_on_duty": Driver.objects.filter(status=Driver.Status.ON_TRIP).count(),
            "fleet_utilization_pct": round(utilization, 2),
        }
        return Response(data)


class ReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report = []
        for v in Vehicle.objects.all():
            distance = sum(
                (t.planned_distance for t in v.trips.filter(status=Trip.Status.COMPLETED)),
                start=0
            ) or 0
            fuel = sum((f.liters for f in v.fuel_logs.all()), start=0) or 0
            fuel_cost = sum((f.cost for f in v.fuel_logs.all()), start=0) or 0
            maintenance_cost = sum((m.cost for m in v.maintenance_logs.all()), start=0) or 0
            # Exclude MAINTENANCE-type expenses to avoid double-counting against MaintenanceLog.cost
            other_expenses = sum(
                (e.amount for e in v.expenses.exclude(type=Expense.Type.MAINTENANCE)), start=0
            ) or 0
            op_cost = fuel_cost + maintenance_cost + other_expenses
            fuel_efficiency = (distance / fuel) if fuel else 0
            
            # Simple, standard revenue calculation: $3.00 per unit distance of completed trips
            revenue = sum(
                (t.planned_distance * 3 for t in v.trips.filter(status=Trip.Status.COMPLETED)),
                start=0
            ) or 0
            
            roi = ((revenue - op_cost) / v.acquisition_cost) if v.acquisition_cost else 0
            report.append(
                {
                    "vehicle": v.registration_number,
                    "fuel_efficiency": round(float(fuel_efficiency), 2),
                    "operational_cost": round(float(op_cost), 2),
                    "roi": round(float(roi), 4),
                }
            )
        return Response(report)


class ReportsCSVExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import csv

        from django.http import HttpResponse

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="reports.csv"'
        writer = csv.writer(response)
        writer.writerow(["Vehicle", "Fuel Efficiency", "Operational Cost", "ROI"])
        for row in ReportsView().get(request).data:
            writer.writerow([row["vehicle"], row["fuel_efficiency"], row["operational_cost"], row["roi"]])
        return response
