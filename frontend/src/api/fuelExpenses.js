import client from "./client";
import { readMock as readMockVehicles, backendUnreachable } from "./vehicles";

const FUEL_MOCK_KEY = "mock_fuel_logs";
const EXPENSE_MOCK_KEY = "mock_expenses";

export const EXPENSE_TYPES = [
  { value: "TOLL", label: "Toll" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

function readFuelMock() {
  try {
    return JSON.parse(localStorage.getItem(FUEL_MOCK_KEY)) || [];
  } catch {
    return [];
  }
}

function writeFuelMock(logs) {
  localStorage.setItem(FUEL_MOCK_KEY, JSON.stringify(logs));
}

function readExpenseMock() {
  try {
    return JSON.parse(localStorage.getItem(EXPENSE_MOCK_KEY)) || [];
  } catch {
    return [];
  }
}

function writeExpenseMock(expenses) {
  localStorage.setItem(EXPENSE_MOCK_KEY, JSON.stringify(expenses));
}

function seedMocks() {
  localStorage.removeItem(FUEL_MOCK_KEY);
  localStorage.removeItem(EXPENSE_MOCK_KEY);
}
seedMocks();

// -- Fuel Logs --
export async function listFuelLogs() {
  try {
    const { data } = await client.get("/fuel-logs/");
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    return readFuelMock();
  }
}

export async function createFuelLog(payload) {
  try {
    const { data } = await client.post("/fuel-logs/", payload);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(error.response?.data?.detail || "Could not create fuel log");
    }
    const logs = readFuelMock();
    const vehicles = readMockVehicles();
    const vObj = vehicles.find((v) => String(v.id) === String(payload.vehicle) || String(v.registration_number) === String(payload.vehicle));
    const newLog = {
      id: `f-${Date.now()}`,
      vehicle: payload.vehicle,
      vehicle_display: vObj ? `${vObj.registration_number} (${vObj.name_model})` : `Vehicle ${payload.vehicle}`,
      liters: Number(payload.liters),
      cost: Number(payload.cost),
      date: payload.date || new Date().toISOString().split("T")[0],
    };
    writeFuelMock([newLog, ...logs]);
    return newLog;
  }
}

// -- Expenses --
export async function listExpenses() {
  try {
    const { data } = await client.get("/expenses/");
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) throw error;
    return readExpenseMock();
  }
}

export async function createExpense(payload) {
  try {
    const { data } = await client.post("/expenses/", payload);
    return data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(error.response?.data?.detail || "Could not create expense");
    }
    const expenses = readExpenseMock();
    const vehicles = readMockVehicles();
    const vObj = vehicles.find((v) => String(v.id) === String(payload.vehicle) || String(v.registration_number) === String(payload.vehicle));
    const newExpense = {
      id: `e-${Date.now()}`,
      vehicle: payload.vehicle,
      vehicle_display: vObj ? `${vObj.registration_number} (${vObj.name_model})` : `Vehicle ${payload.vehicle}`,
      type: payload.type,
      amount: Number(payload.amount),
      date: payload.date || new Date().toISOString().split("T")[0],
    };
    writeExpenseMock([newExpense, ...expenses]);
    return newExpense;
  }
}
