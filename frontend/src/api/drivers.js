import client from "./client";
import { DRIVER_STATUS, DRIVER_STATUSES } from "../lib/enumLabels";

export { DRIVER_STATUSES };

const MOCK_KEY = "mock_drivers";

function readMock() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY)) || [];
  } catch {
    return [];
  }
}

function writeMock(drivers) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(drivers));
}

function seedMock() {
  if (readMock().length === 0) {
    writeMock([
      {
        id: "d-1",
        name: "Alex Carter",
        license_number: "DL-88213",
        license_category: "LMV",
        license_expiry_date: "2027-04-01",
        contact_number: "9876543210",
        safety_score: 92,
        status: DRIVER_STATUS.AVAILABLE,
      },
      {
        id: "d-2",
        name: "Priya Nair",
        license_number: "DL-77012",
        license_category: "HMV",
        license_expiry_date: "2024-01-15",
        contact_number: "9123456780",
        safety_score: 78,
        status: DRIVER_STATUS.OFF_DUTY,
      },
      {
        id: "d-3",
        name: "Sam Wu",
        license_number: "DL-45590",
        license_category: "HMV",
        license_expiry_date: "2026-11-20",
        contact_number: "9988776655",
        safety_score: 65,
        status: DRIVER_STATUS.SUSPENDED,
      },
    ]);
  }
}
seedMock();

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

export function isLicenseExpired(driver) {
  if (!driver.license_expiry_date) return false;
  return new Date(driver.license_expiry_date) < new Date(new Date().toDateString());
}

export async function listDrivers(filters = {}) {
  try {
    const { data } = await client.get(`/drivers/${buildQuery(filters)}`);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    let drivers = readMock();
    if (filters.status) drivers = drivers.filter((d) => d.status === filters.status);
    return drivers;
  }
}

export async function listAvailableDrivers() {
  try {
    const { data } = await client.get("/drivers/available/");
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    return readMock().filter(
      (d) => d.status === DRIVER_STATUS.AVAILABLE && !isLicenseExpired(d),
    );
  }
}

export async function createDriver(payload) {
  try {
    const { data } = await client.post("/drivers/", payload);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(error.response?.data?.detail || "Could not create driver");
    }
    const drivers = readMock();
    if (drivers.some((d) => d.license_number === payload.license_number)) {
      throw new Error("A driver with this license number already exists");
    }
    const driver = { id: `d-${Date.now()}`, ...payload };
    writeMock([...drivers, driver]);
    return driver;
  }
}

export async function updateDriver(id, payload) {
  try {
    const { data } = await client.patch(`/drivers/${id}/`, payload);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(error.response?.data?.detail || "Could not update driver");
    }
    const drivers = readMock();
    const updated = drivers.map((d) => (d.id === id ? { ...d, ...payload } : d));
    writeMock(updated);
    return updated.find((d) => d.id === id);
  }
}
