// Single source of truth for status -> badge color. Keys are canonical
// UPPERCASE_SNAKE_CASE values (see lib/enumLabels.js) - display labels are
// looked up separately via statusLabel(), never duplicated as keys here.
export const VEHICLE_STATUS_VARIANTS = {
  AVAILABLE: "green",
  ON_TRIP: "blue",
  IN_SHOP: "amber",
  RETIRED: "gray",
};

export const DRIVER_STATUS_VARIANTS = {
  AVAILABLE: "green",
  ON_TRIP: "blue",
  OFF_DUTY: "gray",
  SUSPENDED: "red",
};

export const TRIP_STATUS_VARIANTS = {
  DRAFT: "amber",
  DISPATCHED: "blue",
  COMPLETED: "green",
  CANCELLED: "red",
};

export const MAINTENANCE_STATUS_VARIANTS = {
  OPEN: "amber",
  CLOSED: "green",
};
