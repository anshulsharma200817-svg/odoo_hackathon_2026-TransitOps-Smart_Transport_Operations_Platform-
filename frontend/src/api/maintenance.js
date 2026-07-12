import client from "./client";
import { readMock as readMockVehicles, writeMock as writeMockVehicles, backendUnreachable } from "./vehicles";

const MOCK_KEY = "mock_maintenance";

function readMock() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY)) || [];
  } catch {
    return [];
  }
}

function writeMock(logs) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(logs));
}

function seedMock() {
  if (readMock().length === 0) {
    writeMock([
      {
        id: "m-1",
        vehicle: "v-2",
        vehicle_display: "TRK-12 (Ashok Leyland Dost)",
        description: "Brake pad replacement and hydraulic line inspection",
        cost: 4500,
        date_opened: new Date().toISOString().split("T")[0],
        date_closed: null,
        status: "Open",
      },
      {
        id: "m-2",
        vehicle: "v-1",
        vehicle_display: "VAN-05 (Tata Ace)",
        description: "Routine 10,000 km oil change and wheel alignment",
        cost: 2100,
        date_opened: "2026-07-01",
        date_closed: "2026-07-03",
        status: "Closed",
      },
    ]);
  }
}
seedMock();

export async function listMaintenanceLogs() {
  try {
    const { data } = await client.get("/maintenance/");
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    return readMock();
  }
}

export async function createMaintenanceLog(payload) {
  // Check vehicle status first across local/mock vehicle pool
  const vehicles = readMockVehicles();
  const vehicleObj = vehicles.find(
    (v) =>
      String(v.id) === String(payload.vehicle) ||
      String(v.registration_number) === String(payload.vehicle)
  );

  if (vehicleObj && (vehicleObj.status === "Retired" || vehicleObj.status === "RETIRED")) {
    throw new Error("Cannot open a maintenance record for a retired vehicle.");
  }

  // Ensure mock/local vehicles are updated to "In Shop" when a maintenance log opens
  if (vehicleObj && vehicleObj.status !== "In Shop" && vehicleObj.status !== "IN_SHOP") {
    const updatedVehicles = vehicles.map((v) =>
      String(v.id) === String(vehicleObj.id) || String(v.registration_number) === String(vehicleObj.registration_number)
        ? { ...v, status: v.status === "AVAILABLE" || v.status === "ON_TRIP" ? "IN_SHOP" : "In Shop" }
        : v
    );
    writeMockVehicles(updatedVehicles);
  }

  try {
    const { data } = await client.post("/maintenance/", payload);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(error.response?.data?.detail || "Could not create maintenance log");
    }
    const logs = readMock();
    const newLog = {
      id: `m-${Date.now()}`,
      vehicle: payload.vehicle,
      vehicle_display: vehicleObj
        ? `${vehicleObj.registration_number} (${vehicleObj.name_model})`
        : `Vehicle ${payload.vehicle}`,
      description: payload.description,
      cost: Number(payload.cost || 0),
      date_opened: payload.date_opened || new Date().toISOString().split("T")[0],
      date_closed: null,
      status: "Open",
    };
    writeMock([newLog, ...logs]);
    return newLog;
  }
}

export async function closeMaintenanceLog(id) {
  let closedLog = null;
  try {
    const { data } = await client.post(`/maintenance/${id}/close/`, {});
    closedLog = data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(error.response?.data?.detail || "Could not close maintenance log");
    }
    const logs = readMock();
    const target = logs.find((l) => String(l.id) === String(id));
    if (!target) {
      throw new Error("Maintenance log not found");
    }
    target.status = "Closed";
    target.date_closed = new Date().toISOString().split("T")[0];
    writeMock(logs);
    closedLog = target;
  }

  // Check and update local vehicle status: restore to Available UNLESS vehicle is Retired
  const vehicles = readMockVehicles();
  const vehicleId = closedLog?.vehicle;
  const vehicleObj = vehicles.find(
    (v) =>
      String(v.id) === String(vehicleId) ||
      String(v.registration_number) === String(vehicleId) ||
      (closedLog?.vehicle_display && closedLog.vehicle_display.includes(String(v.registration_number)))
  );

  let resultVehicleStatus = vehicleObj?.status || null;
  let vehicleReg = vehicleObj?.registration_number || closedLog?.vehicle_display || closedLog?.vehicle || "Vehicle";

  if (vehicleObj) {
    if (vehicleObj.status === "Retired" || vehicleObj.status === "RETIRED") {
      // Stays Retired per requirement
      resultVehicleStatus = vehicleObj.status;
    } else {
      const newStatus = vehicleObj.status === "IN_SHOP" ? "AVAILABLE" : "Available";
      const updatedVehicles = vehicles.map((v) =>
        String(v.id) === String(vehicleObj.id) ? { ...v, status: newStatus } : v
      );
      writeMockVehicles(updatedVehicles);
      resultVehicleStatus = newStatus;
    }
  }

  return {
    ...closedLog,
    _vehicleStatus: resultVehicleStatus,
    _vehicleRegistration: vehicleReg,
  };
}
