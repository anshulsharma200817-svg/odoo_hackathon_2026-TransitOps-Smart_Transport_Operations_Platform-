import client from "./client";
import { readMock as readMockVehicles } from "./vehicles";
import { VEHICLE_STATUS, DRIVER_STATUS, TRIP_STATUS } from "../lib/enumLabels";

function backendUnreachable(error) {
  return !error.response || error.response.status === 401 || error.response.status >= 500;
}

function buildQuery(filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function readMockDrivers() {
  try {
    return JSON.parse(localStorage.getItem("mock_drivers")) || [];
  } catch {
    return [];
  }
}

function readMockTrips() {
  try {
    return JSON.parse(localStorage.getItem("mock_trips")) || [];
  } catch {
    return [];
  }
}

// Mirrors backend/core/views.py DashboardView exactly: excludes Retired
// vehicles from the "active" pool, then applies the same optional
// type/status/region filters before computing counts.
function computeMockSummary(filters = {}) {
  let vehicles = readMockVehicles().filter((v) => v.status !== VEHICLE_STATUS.RETIRED);
  if (filters.type) vehicles = vehicles.filter((v) => v.type === filters.type);
  if (filters.status) vehicles = vehicles.filter((v) => v.status === filters.status);
  if (filters.region) vehicles = vehicles.filter((v) => v.region === filters.region);

  const totalActive = vehicles.length;
  const onTrip = vehicles.filter((v) => v.status === VEHICLE_STATUS.ON_TRIP).length;
  const vehicleIds = new Set(vehicles.map((v) => String(v.id)));

  const trips = readMockTrips();
  const scoped = filters.type || filters.status || filters.region
    ? trips.filter((t) => vehicleIds.has(String(t.vehicle_id)))
    : trips;

  return {
    active_vehicles: totalActive,
    available_vehicles: vehicles.filter((v) => v.status === VEHICLE_STATUS.AVAILABLE).length,
    vehicles_in_maintenance: vehicles.filter((v) => v.status === VEHICLE_STATUS.IN_SHOP).length,
    active_trips: scoped.filter((t) => t.status === TRIP_STATUS.DISPATCHED).length,
    pending_trips: scoped.filter((t) => t.status === TRIP_STATUS.DRAFT).length,
    drivers_on_duty: readMockDrivers().filter((d) => d.status === DRIVER_STATUS.ON_TRIP).length,
    fleet_utilization_pct: totalActive ? Math.round((onTrip / totalActive) * 10000) / 100 : 0,
  };
}

export async function getDashboardSummary(filters = {}) {
  try {
    const { data } = await client.get(`/dashboard/${buildQuery(filters)}`);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    return computeMockSummary(filters);
  }
}
