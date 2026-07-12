import client from "./client";

const MOCK_KEY = "mock_vehicles";
export const VEHICLE_STATUSES = ["Available", "On Trip", "In Shop", "Retired"];

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
  if (readMock().length === 0) {
    writeMock([
      {
        id: "v-1",
        registration_number: "VAN-05",
        name_model: "Tata Ace",
        type: "Van",
        max_load_capacity: 500,
        odometer: 12000,
        acquisition_cost: 850000,
        status: "Available",
        region: "North",
      },
      {
        id: "v-2",
        registration_number: "TRK-12",
        name_model: "Ashok Leyland Dost",
        type: "Truck",
        max_load_capacity: 5000,
        odometer: 45210,
        acquisition_cost: 2200000,
        status: "In Shop",
        region: "West",
      },
      {
        id: "v-3",
        registration_number: "TRL-09",
        name_model: "Eicher Trailer",
        type: "Trailer",
        max_load_capacity: 12000,
        odometer: 8100,
        acquisition_cost: 3100000,
        status: "Retired",
        region: "South",
      },
    ]);
  }
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
    return readMock().filter((v) => v.status === "Available");
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
