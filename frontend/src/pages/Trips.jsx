import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import {
  listTrips,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  TRIP_STATUSES,
} from "../api/trips";
import { listAvailableVehicles } from "../api/vehicles";
import { listAvailableDrivers } from "../api/drivers";
import { TRIP_STATUS_VARIANTS } from "../lib/statusVariants";

const EMPTY_CREATE_FORM = {
  source: "",
  destination: "",
  vehicle_id: "",
  driver_id: "",
  cargo_weight: "",
  planned_distance: "",
};

function CreateTripForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchOptions() {
      try {
        const [vList, dList] = await Promise.all([
          listAvailableVehicles().catch(() => []),
          listAvailableDrivers().catch(() => []),
        ]);
        if (mounted) {
          setVehicles(vList || []);
          setDrivers(dList || []);
          if (vList?.length > 0 && !form.vehicle_id) {
            setForm((f) => ({ ...f, vehicle_id: vList[0].id || vList[0].registration_number }));
          }
          if (dList?.length > 0 && !form.driver_id) {
            setForm((f) => ({ ...f, driver_id: dList[0].id || dList[0].name }));
          }
        }
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    }
    fetchOptions();
    return () => {
      mounted = false;
    };
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selectedVehicle = useMemo(() => {
    return vehicles.find(
      (v) => String(v.id) === String(form.vehicle_id) || String(v.registration_number) === String(form.vehicle_id)
    );
  }, [vehicles, form.vehicle_id]);

  const isOverCapacity = useMemo(() => {
    if (!selectedVehicle || !form.cargo_weight) return false;
    return Number(form.cargo_weight) > Number(selectedVehicle.max_load_capacity);
  }, [selectedVehicle, form.cargo_weight]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.source.trim() || !form.destination.trim()) {
      setError("Please specify both source and destination.");
      return;
    }
    if (!form.vehicle_id || !form.driver_id) {
      setError("Please select both an available vehicle and an available driver.");
      return;
    }
    if (!form.cargo_weight || Number(form.cargo_weight) < 0) {
      setError("Please enter a valid cargo weight.");
      return;
    }
    if (!form.planned_distance || Number(form.planned_distance) < 0) {
      setError("Please enter a valid planned distance.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        source: form.source.trim(),
        destination: form.destination.trim(),
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id,
        cargo_weight: Number(form.cargo_weight),
        planned_distance: Number(form.planned_distance),
      });
    } catch (err) {
      setError(err.message || "Could not create trip");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="animate-fade-in-up rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingOptions ? (
        <p className="text-sm text-slate-500">Loading available vehicles and drivers…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Source / Origin"
              required
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              placeholder="Mumbai Central Depot"
            />
            <Input
              label="Destination"
              required
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              placeholder="Pune Logistics Hub"
            />
          </div>

          <Select
            label="Assign Vehicle (Available only)"
            required
            value={form.vehicle_id}
            onChange={(e) => update("vehicle_id", e.target.value)}
          >
            {vehicles.length === 0 && <option value="">No available vehicles found</option>}
            {vehicles.map((v) => (
              <option key={v.id || v.registration_number} value={v.id || v.registration_number}>
                {v.registration_number} — {v.name_model} (Max Cap: {v.max_load_capacity} kg)
              </option>
            ))}
          </Select>

          <Select
            label="Assign Driver (Available only)"
            required
            value={form.driver_id}
            onChange={(e) => update("driver_id", e.target.value)}
          >
            {drivers.length === 0 && <option value="">No available drivers found</option>}
            {drivers.map((d) => (
              <option key={d.id || d.name} value={d.id || d.name}>
                {d.name} ({d.license_number})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Cargo Weight (kg)"
                type="number"
                min="0"
                required
                value={form.cargo_weight}
                onChange={(e) => update("cargo_weight", e.target.value)}
                placeholder="350"
              />
              {selectedVehicle && (
                <p className="mt-1 text-xs text-slate-500">
                  Max capacity: <span className="font-medium text-slate-700">{selectedVehicle.max_load_capacity} kg</span>
                </p>
              )}
            </div>
            <Input
              label="Planned Distance (km)"
              type="number"
              min="0"
              required
              value={form.planned_distance}
              onChange={(e) => update("planned_distance", e.target.value)}
              placeholder="150"
            />
          </div>

          {isOverCapacity && (
            <div className="animate-fade-in rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ <span className="font-semibold">Capacity Warning:</span> Entered cargo weight ({form.cargo_weight} kg) exceeds {selectedVehicle?.registration_number}&apos;s max capacity ({selectedVehicle?.max_load_capacity} kg). Dispatching will be blocked.
            </div>
          )}
        </>
      )}

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} disabled={loadingOptions || vehicles.length === 0 || drivers.length === 0}>
          Create Trip
        </Button>
      </div>
    </form>
  );
}

function CompleteTripForm({ trip, onSubmit, onCancel }) {
  const [finalOdometer, setFinalOdometer] = useState("");
  const [fuelConsumed, setFuelConsumed] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (finalOdometer === "" || Number(finalOdometer) < 0) {
      setError("Please enter a valid final odometer reading.");
      return;
    }
    if (fuelConsumed === "" || Number(fuelConsumed) < 0) {
      setError("Please enter valid fuel consumed in liters.");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        final_odometer: Number(finalOdometer),
        fuel_consumed: Number(fuelConsumed),
      });
    } catch (err) {
      setError(err.message || "Could not complete trip");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm text-slate-700">
        <div className="flex items-center justify-between font-medium text-slate-900">
          <span>{trip.source} → {trip.destination}</span>
          <Badge variant="blue">Dispatched</Badge>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div><span className="font-medium text-slate-700">Vehicle:</span> {trip.vehicle_display}</div>
          <div><span className="font-medium text-slate-700">Driver:</span> {trip.driver_display}</div>
          <div><span className="font-medium text-slate-700">Cargo:</span> {trip.cargo_weight} kg</div>
          <div><span className="font-medium text-slate-700">Planned Dist:</span> {trip.planned_distance} km</div>
        </div>
      </div>

      {error && (
        <div className="animate-fade-in-up rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        label="Final Odometer Reading (km)"
        type="number"
        min="0"
        required
        value={finalOdometer}
        onChange={(e) => setFinalOdometer(e.target.value)}
        placeholder="12150"
      />

      <Input
        label="Fuel Consumed (liters)"
        type="number"
        min="0"
        step="0.1"
        required
        value={fuelConsumed}
        onChange={(e) => setFuelConsumed(e.target.value)}
        placeholder="35.5"
      />

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Complete Trip
        </Button>
      </div>
    </form>
  );
}

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(null);
  const [cancellingTrip, setCancellingTrip] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);
  const showToast = useToast();

  async function load() {
    setLoading(true);
    try {
      const data = await listTrips({ status: statusFilter });
      setTrips(data || []);
    } catch (err) {
      showToast(err.message || "Failed to load trips", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function handleCreate(values) {
    await createTrip(values);
    showToast("Trip created successfully in Draft status");
    setCreateModalOpen(false);
    load();
  }

  async function handleDispatch(trip) {
    setDispatchingId(trip.id);
    try {
      if (trip.vehicle_max_load_capacity && Number(trip.cargo_weight) > Number(trip.vehicle_max_load_capacity)) {
        throw new Error(
          `Cargo weight (${trip.cargo_weight} kg) exceeds vehicle capacity (${trip.vehicle_max_load_capacity} kg)`
        );
      }
      await dispatchTrip(trip.id);
      showToast("Trip dispatched! Vehicle and driver flipped to On Trip status.");
      load();
    } catch (err) {
      showToast(err.message || "Could not dispatch trip", "error");
    } finally {
      setDispatchingId(null);
    }
  }

  async function handleCompleteSubmit(values) {
    if (!completingTrip) return;
    await completeTrip(completingTrip.id, values);
    showToast("Trip completed! Vehicle and driver restored to Available status.");
    setCompletingTrip(null);
    load();
  }

  async function handleCancelConfirm() {
    if (!cancellingTrip) return;
    try {
      await cancelTrip(cancellingTrip.id);
      showToast("Trip cancelled. Vehicle and driver restored to Available status.");
      setCancellingTrip(null);
      load();
    } catch (err) {
      showToast(err.message || "Could not cancel trip", "error");
    }
  }

  const filtered = trips;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Trips</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, dispatch, and track active transport trips and completion logs.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>New trip</Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Select
          className="w-44"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {TRIP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading trips…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
          No trips match these filters.
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Cargo / Distance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((trip) => (
                  <tr key={trip.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{trip.source}</span>
                        <span className="text-slate-400">→</span>
                        <span>{trip.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{trip.vehicle_display}</td>
                    <td className="px-4 py-3 text-slate-600">{trip.driver_display}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {trip.cargo_weight} kg / {trip.planned_distance} km
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TRIP_STATUS_VARIANTS[trip.status] || "gray"}>
                        {trip.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {trip.status === "Draft" && (
                          <button
                            type="button"
                            onClick={() => handleDispatch(trip)}
                            disabled={dispatchingId === trip.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-glow transition-all hover:bg-brand-700 active:scale-[0.97] disabled:opacity-50"
                          >
                            {dispatchingId === trip.id && (
                              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                            )}
                            Dispatch
                          </button>
                        )}

                        {trip.status === "Dispatched" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setCompletingTrip(trip)}
                              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-glow transition-all hover:bg-emerald-700 active:scale-[0.97]"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancellingTrip(trip)}
                              className="inline-flex items-center rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-[0.97]"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {trip.status === "Completed" && (
                          <span className="text-xs text-slate-500">
                            {trip.final_odometer !== undefined && trip.final_odometer !== null
                              ? `Odo: ${trip.final_odometer} km · Fuel: ${trip.fuel_consumed || 0} L`
                              : "Completed"}
                          </span>
                        )}

                        {trip.status === "Cancelled" && (
                          <span className="text-xs text-slate-400">Cancelled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((trip) => (
              <div
                key={trip.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-colors"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-900">
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{trip.source}</span>
                      <span className="text-slate-400">→</span>
                      <span>{trip.destination}</span>
                    </div>
                  </div>
                  <Badge variant={TRIP_STATUS_VARIANTS[trip.status] || "gray"}>
                    {trip.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span>Veh: {trip.vehicle_display}</span>
                  <span>Drvr: {trip.driver_display}</span>
                  <span>Cargo: {trip.cargo_weight} kg</span>
                  <span>Dist: {trip.planned_distance} km</span>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  {trip.status === "Draft" && (
                    <button
                      type="button"
                      onClick={() => handleDispatch(trip)}
                      disabled={dispatchingId === trip.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-glow transition-all hover:bg-brand-700 active:scale-[0.97]"
                    >
                      Dispatch
                    </button>
                  )}

                  {trip.status === "Dispatched" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCompletingTrip(trip)}
                        className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-glow transition-all hover:bg-emerald-700 active:scale-[0.97]"
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancellingTrip(trip)}
                        className="inline-flex items-center rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-[0.97]"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {trip.status === "Completed" && (
                    <span className="text-xs text-slate-500">
                      {trip.final_odometer !== undefined
                        ? `Odo: ${trip.final_odometer} km · Fuel: ${trip.fuel_consumed || 0} L`
                        : "Completed"}
                    </span>
                  )}

                  {trip.status === "Cancelled" && (
                    <span className="text-xs text-slate-400">Cancelled</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Trip Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create new trip"
      >
        <CreateTripForm onSubmit={handleCreate} onCancel={() => setCreateModalOpen(false)} />
      </Modal>

      {/* Complete Trip Modal */}
      <Modal
        open={Boolean(completingTrip)}
        onClose={() => setCompletingTrip(null)}
        title="Complete Trip"
      >
        {completingTrip && (
          <CompleteTripForm
            trip={completingTrip}
            onSubmit={handleCompleteSubmit}
            onCancel={() => setCompletingTrip(null)}
          />
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={Boolean(cancellingTrip)}
        onClose={() => setCancellingTrip(null)}
        title="Cancel Trip"
      >
        {cancellingTrip && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to cancel the trip from{" "}
              <span className="font-semibold text-slate-900">{cancellingTrip.source}</span> to{" "}
              <span className="font-semibold text-slate-900">{cancellingTrip.destination}</span>?
            </p>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
              This will immediately restore vehicle{" "}
              <span className="font-semibold">{cancellingTrip.vehicle_display}</span> and driver{" "}
              <span className="font-semibold">{cancellingTrip.driver_display}</span> to{" "}
              <span className="font-semibold">Available</span> status.
            </div>
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button type="button" variant="secondary" onClick={() => setCancellingTrip(null)}>
                Go Back
              </Button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition-all hover:bg-red-700 active:scale-[0.97]"
              >
                Yes, cancel trip
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
