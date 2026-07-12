import client from "./client";
import { VEHICLE_STATUS, VEHICLE_STATUSES } from "../lib/enumLabels";

export { VEHICLE_STATUSES };

const MOCK_KEY = "mock_vehicles";

export function readMock() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY)) || [];
  } catch {
    return [];
  }
}

export function writeMock(vehicles) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(vehicles));
}

function seedMock() {
  localStorage.removeItem(MOCK_KEY);
}
seedMock();

// No response at all means the real API isn't reachable yet, so fall back
// to the mock. A response that came back (4xx/5xx) means the real backend
// is live and its error should win.
export function backendUnreachable(error) {
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

export async function listVehicles(filters = {}) {
  try {
    const { data } = await client.get(`/vehicles/${buildQuery(filters)}`);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    let vehicles = readMock();
    if (filters.status) vehicles = vehicles.filter((v) => v.status === filters.status);
    if (filters.type) vehicles = vehicles.filter((v) => v.type === filters.type);
    if (filters.region) vehicles = vehicles.filter((v) => v.region === filters.region);
    return vehicles;
  }
}

export async function listAvailableVehicles() {
  try {
    const { data } = await client.get("/vehicles/available/");
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    return readMock().filter((v) => v.status === VEHICLE_STATUS.AVAILABLE);
  }
}

export async function createVehicle(payload) {
  try {
    const { data } = await client.post("/vehicles/", payload);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(error.response?.data?.detail || "Could not create vehicle");
    }
    const vehicles = readMock();
    if (vehicles.some((v) => v.registration_number === payload.registration_number)) {
      throw new Error("A vehicle with this registration number already exists");
    }
    const vehicle = { id: `v-${Date.now()}`, ...payload };
    writeMock([...vehicles, vehicle]);
    return vehicle;
  }
}

export async function updateVehicle(id, payload) {
  try {
    const { data } = await client.patch(`/vehicles/${id}/`, payload);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(error.response?.data?.detail || "Could not update vehicle");
    }
    const vehicles = readMock();
    const updated = vehicles.map((v) => (v.id === id ? { ...v, ...payload } : v));
    writeMock(updated);
    return updated.find((v) => v.id === id);
  }
}
