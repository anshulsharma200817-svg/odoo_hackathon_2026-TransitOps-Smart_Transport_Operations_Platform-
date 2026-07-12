// Single source of truth for every enum the backend defines. Canonical
// values MUST match the backend exactly (UPPERCASE_SNAKE_CASE) - these are
// what gets sent to/received from the API and compared against everywhere
// in app logic. Convert to a friendly label only at the point of render,
// via statusLabel() - never scatter "Available" / "AVAILABLE" dual-casing
// checks through page code again.

export const VEHICLE_STATUS = {
  AVAILABLE: "AVAILABLE",
  ON_TRIP: "ON_TRIP",
  IN_SHOP: "IN_SHOP",
  RETIRED: "RETIRED",
};
export const VEHICLE_STATUSES = Object.values(VEHICLE_STATUS);

export const DRIVER_STATUS = {
  AVAILABLE: "AVAILABLE",
  ON_TRIP: "ON_TRIP",
  OFF_DUTY: "OFF_DUTY",
  SUSPENDED: "SUSPENDED",
};
export const DRIVER_STATUSES = Object.values(DRIVER_STATUS);

export const TRIP_STATUS = {
  DRAFT: "DRAFT",
  DISPATCHED: "DISPATCHED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};
export const TRIP_STATUSES = Object.values(TRIP_STATUS);

export const MAINTENANCE_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
};
export const MAINTENANCE_STATUSES = Object.values(MAINTENANCE_STATUS);

export const EXPENSE_TYPE = {
  TOLL: "TOLL",
  MAINTENANCE: "MAINTENANCE",
  OTHER: "OTHER",
};

export const ROLE = {
  FLEET_MANAGER: "FLEET_MANAGER",
  DRIVER: "DRIVER",
  SAFETY_OFFICER: "SAFETY_OFFICER",
  FINANCIAL_ANALYST: "FINANCIAL_ANALYST",
};
export const ROLES = Object.values(ROLE);

const LABELS = {
  // vehicle + driver + trip statuses (AVAILABLE/ON_TRIP shared, no conflict)
  AVAILABLE: "Available",
  ON_TRIP: "On Trip",
  IN_SHOP: "In Shop",
  RETIRED: "Retired",
  OFF_DUTY: "Off Duty",
  SUSPENDED: "Suspended",
  DRAFT: "Draft",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  // maintenance
  OPEN: "Open",
  CLOSED: "Closed",
  // expense types
  TOLL: "Toll",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
  // roles
  FLEET_MANAGER: "Fleet Manager",
  DRIVER: "Driver",
  SAFETY_OFFICER: "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
};

// Canonical enum value -> friendly display label. Falls back to the raw
// value itself so unrecognized values still render instead of disappearing.
export function statusLabel(value) {
  return LABELS[value] || value;
}
