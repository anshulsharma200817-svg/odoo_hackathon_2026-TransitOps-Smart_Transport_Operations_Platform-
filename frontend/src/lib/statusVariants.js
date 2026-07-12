// Single source of truth for status -> badge color, so every screen (and
// later hours: trips, maintenance) stays consistent instead of picking
// arbitrary colors per status.
export const VEHICLE_STATUS_VARIANTS = {
  Available: "green",
  AVAILABLE: "green",
  "On Trip": "blue",
  ON_TRIP: "blue",
  "In Shop": "amber",
  IN_SHOP: "amber",
  Retired: "gray",
  RETIRED: "gray",
};

export const DRIVER_STATUS_VARIANTS = {
  Available: "green",
  AVAILABLE: "green",
  "On Trip": "blue",
  ON_TRIP: "blue",
  "Off Duty": "gray",
  OFF_DUTY: "gray",
  Suspended: "red",
  SUSPENDED: "red",
};

export const TRIP_STATUS_VARIANTS = {
  Draft: "amber",
  DRAFT: "amber",
  Dispatched: "blue",
  DISPATCHED: "blue",
  Completed: "green",
  COMPLETED: "green",
  Cancelled: "red",
  CANCELLED: "red",
};

export const MAINTENANCE_STATUS_VARIANTS = {
  Open: "amber",
  OPEN: "amber",
  Closed: "green",
  CLOSED: "green",
};


