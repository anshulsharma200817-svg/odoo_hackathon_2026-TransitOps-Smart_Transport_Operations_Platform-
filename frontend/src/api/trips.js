import client from "./client";
import { listVehicles } from "./vehicles";
import { listDrivers, isLicenseExpired } from "./drivers";
import { TRIP_STATUS, TRIP_STATUSES, VEHICLE_STATUS, DRIVER_STATUS, statusLabel } from "../lib/enumLabels";

export { TRIP_STATUSES };

const MOCK_KEY = "mock_trips";

function readMock() {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY)) || [];
  } catch {
    return [];
  }
}

function writeMock(trips) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(trips));
}

function seedMock() {
  if (readMock().length === 0) {
    writeMock([
      {
        id: "t-1",
        source: "Mumbai Central Depot",
        destination: "Pune Logistics Hub",
        vehicle_id: "v-1",
        driver_id: "d-1",
        cargo_weight: 350,
        planned_distance: 150,
        status: TRIP_STATUS.DRAFT,
        created_at: "2026-07-12",
        vehicle_display: "VAN-05 (Tata Ace)",
        vehicle_registration_number: "VAN-05",
        vehicle_max_load_capacity: 500,
        driver_display: "Alex Carter",
        driver_name: "Alex Carter",
      },
      {
        id: "t-2",
        source: "Delhi North Yard",
        destination: "Jaipur Express Depot",
        vehicle_id: "v-1",
        driver_id: "d-1",
        cargo_weight: 420,
        planned_distance: 280,
        status: TRIP_STATUS.COMPLETED,
        created_at: "2026-07-10",
        completed_at: "2026-07-11T14:30:00.000Z",
        final_odometer: 11950,
        fuel_consumed: 35,
        vehicle_display: "VAN-05 (Tata Ace)",
        vehicle_registration_number: "VAN-05",
        vehicle_max_load_capacity: 500,
        driver_display: "Alex Carter",
        driver_name: "Alex Carter",
      },
    ]);
  }
}
seedMock();

function backendUnreachable(error) {
  return !error.response || error.response.status === 401 || error.response.status >= 500;
}

function extractErrorMessage(error, fallbackMessage) {
  if (!error.response) return fallbackMessage;
  const data = error.response.data;
  if (!data) return fallbackMessage;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  if (data.non_field_errors) {
    return Array.isArray(data.non_field_errors)
      ? data.non_field_errors.join(", ")
      : data.non_field_errors;
  }
  if (typeof data === "object") {
    const messages = Object.entries(data)
      .map(([field, msgs]) => {
        const msgStr = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
        return field !== "detail" && field !== "error" ? `${field}: ${msgStr}` : msgStr;
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join("; ");
  }
  return fallbackMessage;
}

function buildQuery(filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

async function enrichTrips(trips) {
  let vehicles = [];
  let drivers = [];
  try {
    const [vList, dList] = await Promise.all([
      listVehicles().catch(() => []),
      listDrivers().catch(() => []),
    ]);
    vehicles = vList || [];
    drivers = dList || [];
  } catch {
    // If fetching fails, we proceed with whatever fields exist on trip
  }

  return trips.map((trip) => {
    const vId = trip.vehicle || trip.vehicle_id || (typeof trip.vehicle === "object" ? trip.vehicle.id : null);
    const dId = trip.driver || trip.driver_id || (typeof trip.driver === "object" ? trip.driver.id : null);

    const vehicleObj =
      typeof trip.vehicle === "object" && trip.vehicle !== null
        ? trip.vehicle
        : vehicles.find(
            (v) => String(v.id) === String(vId) || String(v.registration_number) === String(vId)
          );

    const driverObj =
      typeof trip.driver === "object" && trip.driver !== null
        ? trip.driver
        : drivers.find(
            (d) => String(d.id) === String(dId) || String(d.name) === String(dId) || String(d.license_number) === String(dId)
          );

    const vReg = vehicleObj
      ? vehicleObj.registration_number
      : trip.vehicle_registration_number || (typeof trip.vehicle === "string" ? trip.vehicle : vId || "Unknown Vehicle");
    const vModel = vehicleObj ? vehicleObj.name_model : "";
    const vCap = vehicleObj ? vehicleObj.max_load_capacity : trip.vehicle_max_load_capacity || 0;

    const dName = driverObj
      ? driverObj.name
      : trip.driver_name || (typeof trip.driver === "string" ? trip.driver : dId || "Unknown Driver");

    return {
      ...trip,
      vehicle_id: vId || trip.vehicle_id,
      driver_id: dId || trip.driver_id,
      vehicle_display: vModel ? `${vReg} (${vModel})` : vReg,
      vehicle_registration_number: vReg,
      vehicle_max_load_capacity: Number(vCap),
      driver_display: dName,
      driver_name: dName,
    };
  });
}

export async function listTrips(filters = {}) {
  let rawTrips = [];
  try {
    const { data } = await client.get(`/trips/${buildQuery(filters)}`);
    rawTrips = data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(extractErrorMessage(error, "Could not fetch trips"));
    }
    rawTrips = readMock();
    if (filters.status) {
      rawTrips = rawTrips.filter((t) => t.status === filters.status);
    }
  }
  return enrichTrips(rawTrips);
}

export async function createTrip(payload) {
  try {
    const { data } = await client.post("/trips/", payload);
    return (await enrichTrips([data]))[0] || data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(extractErrorMessage(error, "Could not create trip"));
    }
    const trips = readMock();
    let vehicles = [];
    let drivers = [];
    try {
      vehicles = JSON.parse(localStorage.getItem("mock_vehicles")) || [];
      drivers = JSON.parse(localStorage.getItem("mock_drivers")) || [];
    } catch {
      // ignore
    }

    const vehicleObj = vehicles.find(
      (v) => String(v.id) === String(payload.vehicle_id) || String(v.registration_number) === String(payload.vehicle_id)
    );
    const driverObj = drivers.find(
      (d) => String(d.id) === String(payload.driver_id) || String(d.name) === String(payload.driver_id)
    );

    const trip = {
      id: `t-${Date.now()}`,
      source: payload.source,
      destination: payload.destination,
      vehicle_id: payload.vehicle_id,
      driver_id: payload.driver_id,
      cargo_weight: Number(payload.cargo_weight),
      planned_distance: Number(payload.planned_distance),
      status: TRIP_STATUS.DRAFT,
      created_at: new Date().toISOString().split("T")[0],
      vehicle_display: vehicleObj ? `${vehicleObj.registration_number} (${vehicleObj.name_model})` : String(payload.vehicle_id),
      vehicle_registration_number: vehicleObj ? vehicleObj.registration_number : String(payload.vehicle_id),
      vehicle_max_load_capacity: vehicleObj ? vehicleObj.max_load_capacity : 0,
      driver_display: driverObj ? driverObj.name : String(payload.driver_id),
      driver_name: driverObj ? driverObj.name : String(payload.driver_id),
    };

    writeMock([trip, ...trips]);
    return trip;
  }
}

export async function dispatchTrip(id) {
  try {
    const { data } = await client.post(`/trips/${id}/dispatch/`);
    return (await enrichTrips([data]))[0] || data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(extractErrorMessage(error, "Could not dispatch trip"));
    }
    const trips = readMock();
    const trip = trips.find((t) => String(t.id) === String(id));
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== TRIP_STATUS.DRAFT) {
      throw new Error(`Cannot dispatch a trip with status "${statusLabel(trip.status)}"`);
    }

    let vehicles = [];
    let drivers = [];
    try {
      vehicles = JSON.parse(localStorage.getItem("mock_vehicles")) || [];
      drivers = JSON.parse(localStorage.getItem("mock_drivers")) || [];
    } catch {
      // ignore
    }

    const vehicle = vehicles.find(
      (v) => String(v.id) === String(trip.vehicle_id) || String(v.registration_number) === String(trip.vehicle_id) || String(v.registration_number) === String(trip.vehicle_registration_number)
    );
    const driver = drivers.find(
      (d) => String(d.id) === String(trip.driver_id) || String(d.name) === String(trip.driver_id) || String(d.name) === String(trip.driver_name)
    );

    // Validate vehicle
    if (!vehicle) {
      throw new Error("Assigned vehicle not found");
    }
    if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) {
      throw new Error(
        `Vehicle ${vehicle.registration_number} is not available (Status: ${statusLabel(vehicle.status)})`,
      );
    }
    if (Number(trip.cargo_weight) > Number(vehicle.max_load_capacity)) {
      throw new Error(`Cargo weight (${trip.cargo_weight} kg) exceeds vehicle capacity (${vehicle.max_load_capacity} kg)`);
    }

    // Validate driver
    if (!driver) {
      throw new Error("Assigned driver not found");
    }
    if (driver.status === DRIVER_STATUS.SUSPENDED) {
      throw new Error(`Driver ${driver.name} is Suspended and cannot be dispatched`);
    }
    if (isLicenseExpired(driver)) {
      throw new Error(`Driver ${driver.name}'s license expired on ${driver.license_expiry_date}`);
    }
    if (driver.status !== DRIVER_STATUS.AVAILABLE) {
      throw new Error(`Driver ${driver.name} is not available (Status: ${statusLabel(driver.status)})`);
    }

    // Update statuses
    trip.status = TRIP_STATUS.DISPATCHED;
    trip.dispatched_at = new Date().toISOString();

    vehicle.status = VEHICLE_STATUS.ON_TRIP;
    driver.status = DRIVER_STATUS.ON_TRIP;

    localStorage.setItem("mock_vehicles", JSON.stringify(vehicles));
    localStorage.setItem("mock_drivers", JSON.stringify(drivers));
    writeMock(trips);

    return trip;
  }
}

export async function completeTrip(id, { final_odometer, fuel_consumed }) {
  try {
    const { data } = await client.post(`/trips/${id}/complete/`, {
      final_odometer: Number(final_odometer),
      fuel_consumed: Number(fuel_consumed),
    });
    return (await enrichTrips([data]))[0] || data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(extractErrorMessage(error, "Could not complete trip"));
    }
    const trips = readMock();
    const trip = trips.find((t) => String(t.id) === String(id));
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== TRIP_STATUS.DISPATCHED) {
      throw new Error("Only Dispatched trips can be completed");
    }

    trip.status = TRIP_STATUS.COMPLETED;
    trip.final_odometer = Number(final_odometer);
    trip.fuel_consumed = Number(fuel_consumed);
    trip.completed_at = new Date().toISOString();

    let vehicles = [];
    let drivers = [];
    try {
      vehicles = JSON.parse(localStorage.getItem("mock_vehicles")) || [];
      drivers = JSON.parse(localStorage.getItem("mock_drivers")) || [];
    } catch {
      // ignore
    }

    const vehicle = vehicles.find(
      (v) => String(v.id) === String(trip.vehicle_id) || String(v.registration_number) === String(trip.vehicle_id) || String(v.registration_number) === String(trip.vehicle_registration_number)
    );
    if (vehicle) {
      vehicle.status = VEHICLE_STATUS.AVAILABLE;
      if (!isNaN(final_odometer) && Number(final_odometer) > 0) {
        vehicle.odometer = Number(final_odometer);
      }
      localStorage.setItem("mock_vehicles", JSON.stringify(vehicles));
    }

    const driver = drivers.find(
      (d) => String(d.id) === String(trip.driver_id) || String(d.name) === String(trip.driver_id) || String(d.name) === String(trip.driver_name)
    );
    if (driver) {
      driver.status = DRIVER_STATUS.AVAILABLE;
      localStorage.setItem("mock_drivers", JSON.stringify(drivers));
    }

    writeMock(trips);
    return trip;
  }
}

export async function cancelTrip(id) {
  try {
    const { data } = await client.post(`/trips/${id}/cancel/`);
    return (await enrichTrips([data]))[0] || data;
  } catch (error) {
    if (!backendUnreachable(error)) {
      throw new Error(extractErrorMessage(error, "Could not cancel trip"));
    }
    const trips = readMock();
    const trip = trips.find((t) => String(t.id) === String(id));
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== TRIP_STATUS.DISPATCHED) {
      throw new Error("Only Dispatched trips can be cancelled");
    }

    trip.status = TRIP_STATUS.CANCELLED;
    trip.cancelled_at = new Date().toISOString();

    let vehicles = [];
    let drivers = [];
    try {
      vehicles = JSON.parse(localStorage.getItem("mock_vehicles")) || [];
      drivers = JSON.parse(localStorage.getItem("mock_drivers")) || [];
    } catch {
      // ignore
    }

    const vehicle = vehicles.find(
      (v) => String(v.id) === String(trip.vehicle_id) || String(v.registration_number) === String(trip.vehicle_id) || String(v.registration_number) === String(trip.vehicle_registration_number)
    );
    if (vehicle) {
      vehicle.status = VEHICLE_STATUS.AVAILABLE;
      localStorage.setItem("mock_vehicles", JSON.stringify(vehicles));
    }

    const driver = drivers.find(
      (d) => String(d.id) === String(trip.driver_id) || String(d.name) === String(trip.driver_id) || String(d.name) === String(trip.driver_name)
    );
    if (driver) {
      driver.status = DRIVER_STATUS.AVAILABLE;
      localStorage.setItem("mock_drivers", JSON.stringify(drivers));
    }

    writeMock(trips);
    return trip;
  }
}
