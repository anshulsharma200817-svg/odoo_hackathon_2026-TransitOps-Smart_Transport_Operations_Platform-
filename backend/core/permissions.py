from rest_framework.permissions import BasePermission


class IsFleetManager(BasePermission):
    """Restrict an action to the Fleet Manager role. Extend similarly per role as needed."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "FLEET_MANAGER")


class IsFleetManagerOrDriver(BasePermission):
    """Restrict an action to Fleet Manager or Driver roles."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ["FLEET_MANAGER", "DRIVER"]
        )

