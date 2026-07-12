import client from "./client";
import { readMock as readMockVehicles } from "./vehicles";
import { TRIP_STATUS } from "../lib/enumLabels";

function backendUnreachable(error) {
  return !error.response || error.response.status === 401 || error.response.status >= 500;
}

function readMockList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

// Mirrors backend/core/views.py ReportsView exactly, so the mock fallback
// stays honest about what the real endpoint computes.
function computeMockReport() {
  const vehicles = readMockVehicles();
  const trips = readMockList("mock_trips");
  const fuelLogs = readMockList("mock_fuel_logs");
  const expenses = readMockList("mock_expenses");
  const maintenanceLogs = readMockList("mock_maintenance");

  return vehicles.map((v) => {
    const vTrips = trips.filter(
      (t) => String(t.vehicle_id || t.vehicle) === String(v.id) && t.status === TRIP_STATUS.COMPLETED,
    );
    const distance = vTrips.reduce((acc, t) => acc + (Number(t.planned_distance) || 0), 0);

    const vFuelLogs = fuelLogs.filter((f) => String(f.vehicle) === String(v.id));
    const fuel = vFuelLogs.reduce((acc, f) => acc + (Number(f.liters) || 0), 0);
    const fuelCost = vFuelLogs.reduce((acc, f) => acc + (Number(f.cost) || 0), 0);

    const maintenanceCost = maintenanceLogs
      .filter((m) => String(m.vehicle) === String(v.id))
      .reduce((acc, m) => acc + (Number(m.cost) || 0), 0);

    // Exclude MAINTENANCE-type expenses to avoid double-counting against MaintenanceLog.cost
    const otherExpenses = expenses
      .filter((e) => String(e.vehicle) === String(v.id) && e.type !== "MAINTENANCE")
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const opCost = fuelCost + maintenanceCost + otherExpenses;
    const fuelEfficiency = fuel ? distance / fuel : 0;
    // Same placeholder revenue model as the backend: $3.00 per unit distance
    // of completed trips, pending the real revenue-tracking blocker.
    const revenue = vTrips.reduce((acc, t) => acc + (Number(t.planned_distance) || 0) * 3, 0);
    const roi = v.acquisition_cost ? (revenue - opCost) / v.acquisition_cost : 0;

    return {
      vehicle: v.registration_number,
      vehicle_name: v.name_model,
      fuel_efficiency: Math.round(fuelEfficiency * 100) / 100,
      operational_cost: Math.round(opCost * 100) / 100,
      roi: Math.round(roi * 10000) / 10000,
    };
  });
}

export async function getReports() {
  try {
    const { data } = await client.get("/reports/");
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    return computeMockReport();
  }
}

// Real backend file download only - no client-side CSV generation, since
// the endpoint genuinely implements this per the contract and a fake mock
// CSV would misrepresent what's actually being tested.
export async function downloadReportsCsv() {
  let response;
  try {
    response = await client.get("/reports/export/csv/", { responseType: "blob" });
  } catch {
    throw new Error("Could not export CSV - the reports endpoint isn't reachable right now.");
  }
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reports.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
