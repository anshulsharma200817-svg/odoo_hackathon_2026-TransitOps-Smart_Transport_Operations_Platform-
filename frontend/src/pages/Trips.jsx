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
import { TRIP_STATUS, statusLabel } from "../lib/enumLabels";
import { IconRoute, IconTruck, IconUser } from "../components/icons";

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
            setForm((f) => ({ ...f, driver_id: dList[0].id }));
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!form.source || !form.destination || !form.vehicle_id || !form.driver_id) {
        throw new Error("Please fill out all required trip fields");
      }
      const selectedVehicle = vehicles.find(
        (v) => v.id === form.vehicle_id || v.registration_number === form.vehicle_id
      );
      if (
        selectedVehicle &&
        selectedVehicle.max_load_capacity &&
        Number(form.cargo_weight) > Number(selectedVehicle.max_load_capacity)
      ) {
        throw new Error(
          `Cargo weight (${form.cargo_weight} kg) exceeds vehicle max capacity (${selectedVehicle.max_load_capacity} kg)`
        );
      }
      await onSubmit({
        ...form,
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
    <form className="flex flex-col gap-4 animate-scale-in" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-sm font-medium text-red-700 shadow-sm backdrop-blur-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Source Location / Yard"
          required
          value={form.source}
          onChange={(e) => update("source", e.target.value)}
          placeholder="e.g. Mumbai North Hub"
        />
        <Input
          label="Destination / Depot"
          required
          value={form.destination}
          onChange={(e) => update("destination", e.target.value)}
          placeholder="e.g. Pune Central Express"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Assign Available Vehicle
          </label>
          {loadingOptions ? (
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ) : vehicles.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 font-medium">
              No vehicles available right now. Register one or free an "On Trip" vehicle.
            </div>
          ) : (
            <select
              value={form.vehicle_id}
              onChange={(e) => update("vehicle_id", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            >
              {vehicles.map((v) => (
                <option key={v.id || v.registration_number} value={v.id || v.registration_number}>
                  {v.registration_number} ({v.name_model} · {v.max_load_capacity}kg cap)
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
            Assign Available Driver
          </label>
          {loadingOptions ? (
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          ) : drivers.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 font-medium">
              No drivers available. Onboard a new driver or complete existing trips.
            </div>
          ) : (
            <select
              value={form.driver_id}
              onChange={(e) => update("driver_id", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              required
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} (License: {d.license_number} · Score: {d.safety_score})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Cargo Weight (kg)"
          type="number"
          min="0"
          required
          value={form.cargo_weight}
          onChange={(e) => update("cargo_weight", e.target.value)}
          placeholder="e.g. 850"
        />
        <Input
          label="Planned Distance (km)"
          type="number"
          min="0"
          required
          value={form.planned_distance}
          onChange={(e) => update("planned_distance", e.target.value)}
          placeholder="e.g. 165"
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={saving}
          disabled={vehicles.length === 0 || drivers.length === 0}
          className="bg-gradient-to-r from-brand-600 to-indigo-600 shadow-glow hover:shadow-glow-lg transition-all duration-300"
        >
          {saving ? "Creating…" : "Create & Save Draft"}
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
    <form className="flex flex-col gap-4 animate-scale-in" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="rounded-xl bg-indigo-50/70 p-3.5 border border-indigo-100 text-xs text-indigo-900">
        Completing trip <span className="font-bold">{trip.source} → {trip.destination}</span> will release vehicle{" "}
        <span className="font-bold">{trip.vehicle_display}</span> and driver{" "}
        <span className="font-bold">{trip.driver_display}</span> back to <span className="font-bold">Available</span> status.
      </div>
      <Input
        label="Final Vehicle Odometer Reading (km)"
        type="number"
        min="0"
        required
        value={finalOdometer}
        onChange={(e) => setFinalOdometer(e.target.value)}
        placeholder="e.g. 12500"
      />
      <Input
        label="Fuel Consumed During Trip (Liters)"
        type="number"
        min="0"
        step="0.1"
        required
        value={fuelConsumed}
        onChange={(e) => setFuelConsumed(e.target.value)}
        placeholder="e.g. 32.5"
      />
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-glow">
          Log & Complete Trip
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
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
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
    showToast("Trip created successfully in Draft status!");
    setCreateModalOpen(false);
    load();
  }

  async function handleDispatch(trip) {
    setDispatchingId(trip.id);
    try {
      if (
        trip.vehicle_max_load_capacity &&
        Number(trip.cargo_weight) > Number(trip.vehicle_max_load_capacity)
      ) {
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

  const filtered = useMemo(
    () =>
      trips.filter((trip) => {
        const matchesStatus = !statusFilter || trip.status === statusFilter;
        const matchesSearch =
          !searchQuery ||
          trip.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trip.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trip.vehicle_display?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trip.driver_display?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [trips, statusFilter, searchQuery],
  );

  // Quick KPI metrics
  const totalTripsCount = trips.length;
  const activeDispatchedCount = trips.filter((t) => t.status === TRIP_STATUS.DISPATCHED).length;
  const totalCargoInTransit = trips
    .filter((t) => t.status === TRIP_STATUS.DISPATCHED)
    .reduce((acc, t) => acc + (Number(t.cargo_weight) || 0), 0);
  const completedTripsCount = trips.filter((t) => t.status === TRIP_STATUS.COMPLETED).length;

  return (
    <div className="min-h-full space-y-8 p-4 sm:p-8">
      {/* Top Header with Gradient Accent */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-glow">
              <IconRoute className="h-5 w-5 animate-pulse-subtle" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Transport Dispatch & Active Trips
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Create routes, assign vehicles/drivers, dispatch shipments, and log final fuel & mileage metrics.
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2.5 shadow-glow hover:scale-[1.02] hover:shadow-glow-lg transition-all duration-300"
        >
          <span className="text-lg leading-none">+</span> Create New Trip
        </Button>
      </div>

      {/* Interactive KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => setStatusFilter("")}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === ""
              ? "border-brand-500/40 bg-gradient-to-br from-brand-50/80 via-white to-indigo-50/40 shadow-md ring-2 ring-brand-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Trips Logged</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <IconRoute className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{totalTripsCount}</span>
            <span className="text-xs font-semibold text-indigo-600">All itineraries</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === TRIP_STATUS.DISPATCHED ? "" : TRIP_STATUS.DISPATCHED)}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === TRIP_STATUS.DISPATCHED
              ? "border-blue-500/40 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 shadow-md ring-2 ring-blue-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Active In-Transit</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{activeDispatchedCount}</span>
            <span className="text-xs font-semibold text-blue-600">Live on road</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${totalTripsCount ? (activeDispatchedCount / totalTripsCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Cargo In-Transit</span>
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-600">
              Payload
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{totalCargoInTransit.toLocaleString()}</span>
            <span className="text-xs font-semibold text-slate-500">kg active</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full" style={{ width: "75%" }} />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === TRIP_STATUS.COMPLETED ? "" : TRIP_STATUS.COMPLETED)}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === TRIP_STATUS.COMPLETED
              ? "border-emerald-500/40 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 shadow-md ring-2 ring-emerald-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed Trips</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              ✓
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{completedTripsCount}</span>
            <span className="text-xs font-semibold text-emerald-600">Fully logged</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${totalTripsCount ? (completedTripsCount / totalTripsCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & View Switcher */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route, vehicle or driver..."
              className="w-full text-sm"
            />
          </div>
          <Select
            className="w-44 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Trip Statuses</option>
            {TRIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
          {(statusFilter || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setSearchQuery("");
              }}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors px-2 py-1 underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto rounded-xl bg-slate-100 p-1 border border-slate-200/60">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="flex gap-0.5">
              <span className="h-2 w-2 rounded-sm bg-current"></span>
              <span className="h-2 w-2 rounded-sm bg-current"></span>
            </span>
            Grid Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="flex flex-col gap-0.5">
              <span className="h-0.5 w-3 rounded-full bg-current"></span>
              <span className="h-0.5 w-3 rounded-full bg-current"></span>
            </span>
            Table View
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 p-6 shadow-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 py-16 px-6 text-center shadow-sm backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-brand-600 shadow-inner mb-4">
            <IconRoute className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No matching trips found</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Try adjusting your search criteria or create a new trip to dispatch your fleet.
          </p>
          <Button onClick={() => setCreateModalOpen(true)} className="mt-6 bg-brand-600 shadow-glow">
            + Create New Trip
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((trip, idx) => (
            <div
              key={trip.id}
              style={{ animationDelay: `${idx * 60}ms` }}
              className="group animate-fade-in-up relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-xl"
            >
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 transition-opacity ${
                  trip.status === TRIP_STATUS.DISPATCHED
                    ? "bg-blue-500 animate-pulse"
                    : trip.status === TRIP_STATUS.COMPLETED
                    ? "bg-emerald-500"
                    : trip.status === TRIP_STATUS.DRAFT
                    ? "bg-amber-500"
                    : "bg-slate-300"
                }`}
              />

              <div>
                {/* Route Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                    <span className="text-brand-600 group-hover:scale-105 transition-transform">
                      {trip.source}
                    </span>
                    <span className="text-slate-400 font-normal">→</span>
                    <span className="text-slate-800">{trip.destination}</span>
                  </div>
                  <Badge variant={TRIP_STATUS_VARIANTS[trip.status] || "gray"} className="px-2.5 py-1 font-semibold shrink-0">
                    <span className="flex items-center gap-1.5">
                      {trip.status === TRIP_STATUS.DISPATCHED && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                      )}
                      {statusLabel(trip.status)}
                    </span>
                  </Badge>
                </div>

                {/* Assigned Vehicle & Driver */}
                <div className="mt-4 grid grid-cols-1 gap-2.5 rounded-xl bg-slate-50/90 p-3.5 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <IconTruck className="h-3.5 w-3.5 text-indigo-500" /> Assigned Vehicle
                    </span>
                    <span className="font-bold font-mono text-slate-800">{trip.vehicle_display}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <IconUser className="h-3.5 w-3.5 text-purple-500" /> Assigned Driver
                    </span>
                    <span className="font-bold text-slate-800">{trip.driver_display}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-400 font-medium">Cargo Payload</span>
                    <span className="font-bold text-slate-800">{trip.cargo_weight} kg</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-slate-400 font-medium">Planned Distance</span>
                    <span className="font-bold text-slate-800">{trip.planned_distance} km</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                {trip.status === TRIP_STATUS.DRAFT && (
                  <>
                    <span className="text-[11px] font-semibold text-amber-600">Ready to dispatch</span>
                    <button
                      type="button"
                      onClick={() => handleDispatch(trip)}
                      disabled={dispatchingId === trip.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-glow transition-all hover:scale-105 active:scale-[0.97] disabled:opacity-50"
                    >
                      {dispatchingId === trip.id && (
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      )}
                      🚀 Dispatch Trip
                    </button>
                  </>
                )}

                {trip.status === TRIP_STATUS.DISPATCHED && (
                  <div className="flex w-full items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setCancellingTrip(trip)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletingTrip(trip)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-glow transition-all hover:scale-105"
                    >
                      ✓ Log Completion
                    </button>
                  </div>
                )}

                {trip.status === TRIP_STATUS.COMPLETED && (
                  <div className="flex w-full items-center justify-between text-xs text-slate-600 font-medium">
                    <span>
                      Final Odo: <strong className="text-slate-900">{trip.final_odometer || "-"} km</strong>
                    </span>
                    <span>
                      Fuel: <strong className="text-slate-900">{trip.fuel_consumed || 0} L</strong>
                    </span>
                  </div>
                )}

                {trip.status === TRIP_STATUS.CANCELLED && (
                  <span className="text-xs font-semibold text-slate-400 italic">Trip Cancelled</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Route (Source → Destination)</th>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4">Driver</th>
                  <th className="px-6 py-4">Cargo / Distance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((trip, idx) => (
                  <tr
                    key={trip.id}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className="animate-fade-in-up transition-colors hover:bg-indigo-50/30"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-brand-600">{trip.source}</span>
                        <span className="text-slate-400">→</span>
                        <span>{trip.destination}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">{trip.vehicle_display}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{trip.driver_display}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {trip.cargo_weight} kg / {trip.planned_distance} km
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={TRIP_STATUS_VARIANTS[trip.status] || "gray"} className="px-2.5 py-1 font-semibold">
                        <span className="flex items-center gap-1">
                          {trip.status === TRIP_STATUS.DISPATCHED && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                          )}
                          {statusLabel(trip.status)}
                        </span>
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {trip.status === TRIP_STATUS.DRAFT && (
                          <button
                            type="button"
                            onClick={() => handleDispatch(trip)}
                            disabled={dispatchingId === trip.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-glow transition-all hover:bg-brand-700"
                          >
                            Dispatch
                          </button>
                        )}
                        {trip.status === TRIP_STATUS.DISPATCHED && (
                          <>
                            <button
                              type="button"
                              onClick={() => setCompletingTrip(trip)}
                              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-glow transition-all hover:bg-emerald-700"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancellingTrip(trip)}
                              className="inline-flex items-center rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {trip.status === TRIP_STATUS.COMPLETED && (
                          <span className="text-xs text-slate-500 font-medium">
                            {trip.final_odometer !== undefined && trip.final_odometer !== null
                              ? `Odo: ${trip.final_odometer} km · Fuel: ${trip.fuel_consumed || 0} L`
                              : "Completed"}
                          </span>
                        )}
                        {trip.status === TRIP_STATUS.CANCELLED && (
                          <span className="text-xs text-slate-400">Cancelled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create & Assign New Transport Trip"
      >
        <CreateTripForm onSubmit={handleCreate} onCancel={() => setCreateModalOpen(false)} />
      </Modal>

      {/* Complete Trip Modal */}
      <Modal
        open={Boolean(completingTrip)}
        onClose={() => setCompletingTrip(null)}
        title="Log Final Metrics & Complete Trip"
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
        title="Confirm Trip Cancellation"
      >
        {cancellingTrip && (
          <div className="flex flex-col gap-4 animate-scale-in">
            <p className="text-sm text-slate-600">
              Are you sure you want to cancel the active shipment from{" "}
              <span className="font-bold text-slate-900">{cancellingTrip.source}</span> to{" "}
              <span className="font-bold text-slate-900">{cancellingTrip.destination}</span>?
            </p>
            <div className="rounded-xl bg-amber-50 p-3.5 text-xs font-medium text-amber-800 border border-amber-200">
              ⚡ This will immediately restore vehicle{" "}
              <span className="font-bold">{cancellingTrip.vehicle_display}</span> and driver{" "}
              <span className="font-bold">{cancellingTrip.driver_display}</span> to{" "}
              <span className="font-bold">Available</span> status for new dispatches.
            </div>
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button type="button" variant="secondary" onClick={() => setCancellingTrip(null)}>
                Keep Trip Active
              </Button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-glow transition-all hover:bg-red-700 active:scale-[0.97]"
              >
                Yes, Cancel Trip
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
