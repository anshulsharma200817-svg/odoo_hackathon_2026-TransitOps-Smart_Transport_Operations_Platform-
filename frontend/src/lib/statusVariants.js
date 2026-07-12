// Single source of truth for status -> badge color, so every screen (and
// later hours: trips, maintenance) stays consistent instead of picking
// arbitrary colors per status.
export const VEHICLE_STATUS_VARIANTS = {
  Available: "green",
  "On Trip": "blue",
  "In Shop": "amber",
  Retired: "gray",
};

export const DRIVER_STATUS_VARIANTS = {
  Available: "green",
  "On Trip": "blue",
  "Off Duty": "gray",
  Suspended: "red",
};

export const TRIP_STATUS_VARIANTS = {
  Draft: "amber",
  Dispatched: "blue",
  Completed: "green",
  Cancelled: "red",
};

