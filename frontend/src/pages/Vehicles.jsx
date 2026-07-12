import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import { listVehicles, createVehicle, updateVehicle, VEHICLE_STATUSES } from "../api/vehicles";
import { VEHICLE_STATUS_VARIANTS } from "../lib/statusVariants";
import { VEHICLE_STATUS, statusLabel } from "../lib/enumLabels";
import { IconTruck, IconWrench, IconRoute } from "../components/icons";

const EMPTY_FORM = {
  registration_number: "",
  name_model: "",
  type: "",
  max_load_capacity: "",
  odometer: "",
  acquisition_cost: "",
  status: VEHICLE_STATUSES[0],
  region: "",
};

function VehicleForm({ initialValues, onSubmit, onCancel }) {
  const [form, setForm] = useState(initialValues || EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        max_load_capacity: Number(form.max_load_capacity),
        odometer: Number(form.odometer),
        acquisition_cost: Number(form.acquisition_cost),
      });
    } catch (err) {
      setError(err.message || "Could not save vehicle");
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
          label="Registration Number"
          required
          value={form.registration_number}
          onChange={(e) => update("registration_number", e.target.value)}
          placeholder="e.g. VAN-05 or MH-12-AB-1234"
        />
        <Input
          label="Name / Model"
          required
          value={form.name_model}
          onChange={(e) => update("name_model", e.target.value)}
          placeholder="e.g. Tata Ace Gold"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Vehicle Type"
          required
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          placeholder="Van, Truck, EV, Trailer..."
        />
        <Input
          label="Region / Hub"
          required
          value={form.region}
          onChange={(e) => update("region", e.target.value)}
          placeholder="North Yard, Mumbai Central..."
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Max Load Capacity (kg)"
          type="number"
          min="0"
          required
          value={form.max_load_capacity}
          onChange={(e) => update("max_load_capacity", e.target.value)}
          placeholder="e.g. 1500"
        />
        <Input
          label="Current Odometer (km)"
          type="number"
          min="0"
          required
          value={form.odometer}
          onChange={(e) => update("odometer", e.target.value)}
          placeholder="e.g. 24500"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Acquisition Cost (₹)"
          type="number"
          min="0"
          required
          value={form.acquisition_cost}
          onChange={(e) => update("acquisition_cost", e.target.value)}
          placeholder="e.g. 850000"
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
        >
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} className="bg-gradient-to-r from-brand-600 to-indigo-600 shadow-glow hover:shadow-glow-lg transition-all duration-300">
          {saving ? "Saving…" : initialValues ? "Save Changes" : "Create Vehicle"}
        </Button>
      </div>
    </form>
  );
}

export default function Vehicles() {
  const showToast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or table
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await listVehicles();
      setVehicles(data || []);
    } catch {
      showToast("Could not load vehicles", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const types = useMemo(
    () => [...new Set(vehicles.map((v) => v.type).filter(Boolean))],
    [vehicles],
  );
  const regions = useMemo(
    () => [...new Set(vehicles.map((v) => v.region).filter(Boolean))],
    [vehicles],
  );

  const filtered = useMemo(
    () =>
      vehicles.filter((v) => {
        const matchesStatus = !statusFilter || v.status === statusFilter;
        const matchesType = !typeFilter || v.type === typeFilter;
        const matchesRegion = !regionFilter || v.region === regionFilter;
        const matchesSearch =
          !searchQuery ||
          v.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.name_model?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesType && matchesRegion && matchesSearch;
      }),
    [vehicles, statusFilter, typeFilter, regionFilter, searchQuery],
  );

  // Quick KPI metrics
  const totalFleetCount = vehicles.length;
  const activeOnTripCount = vehicles.filter((v) => v.status === VEHICLE_STATUS.ON_TRIP).length;
  const inShopCount = vehicles.filter((v) => v.status === VEHICLE_STATUS.IN_SHOP).length;
  const totalFleetValue = vehicles.reduce((acc, v) => acc + (Number(v.acquisition_cost) || 0), 0);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(vehicle) {
    setEditing(vehicle);
    setModalOpen(true);
  }

  async function handleSubmit(values) {
    if (editing) {
      await updateVehicle(editing.id, values);
      showToast("Vehicle updated successfully!");
    } else {
      await createVehicle(values);
      showToast("New vehicle registered into fleet!");
    }
    setModalOpen(false);
    load();
  }

  return (
    <div className="min-h-full space-y-8 p-4 sm:p-8">
      {/* Top Header with Gradient Accent */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-glow">
              <IconTruck className="h-5 w-5 animate-pulse-subtle" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Fleet Operations & Vehicles
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Real-time tracking, maintenance status, and capacity allocation for your entire transport fleet.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2.5 shadow-glow hover:scale-[1.02] hover:shadow-glow-lg transition-all duration-300"
        >
          <span className="text-lg leading-none">+</span> Register New Vehicle
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Fleet Assets</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <IconTruck className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{totalFleetCount}</span>
            <span className="text-xs font-semibold text-indigo-600">Vehicles registered</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === VEHICLE_STATUS.ON_TRIP ? "" : VEHICLE_STATUS.ON_TRIP)}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === VEHICLE_STATUS.ON_TRIP
              ? "border-emerald-500/40 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 shadow-md ring-2 ring-emerald-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Active On Road</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{activeOnTripCount}</span>
            <span className="text-xs font-semibold text-emerald-600">Live dispatched</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${totalFleetCount ? (activeOnTripCount / totalFleetCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === VEHICLE_STATUS.IN_SHOP ? "" : VEHICLE_STATUS.IN_SHOP)}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === VEHICLE_STATUS.IN_SHOP
              ? "border-amber-500/40 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 shadow-md ring-2 ring-amber-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">In Maintenance</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:rotate-12 transition-transform">
              <IconWrench className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{inShopCount}</span>
            <span className="text-xs font-semibold text-amber-600">Shop service</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${totalFleetCount ? (inShopCount / totalFleetCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/20 blur-xl animate-pulse-subtle" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Asset Value</span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-brand-300 backdrop-blur-md">
              CAPEX
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              ₹{(totalFleetValue / 100000).toFixed(1)}L
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-300 font-medium flex items-center justify-between">
            <span>Cumulative acquisition cost</span>
            <span className="text-brand-400">100% Audit</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & View Switcher */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registration or model..."
              className="w-full text-sm"
            />
          </div>
          <Select
            className="w-40 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
          <Select className="w-36 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            className="w-36 text-sm"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          {(statusFilter || typeFilter || regionFilter || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setTypeFilter("");
                setRegionFilter("");
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
            <div key={n} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 p-6 shadow-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 py-16 px-6 text-center shadow-sm backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-inner mb-4">
            <IconTruck className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No matching vehicles found</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Try adjusting your search query, status filters, or register a new asset into the fleet.
          </p>
          <Button onClick={openCreate} className="mt-6 bg-brand-600 shadow-glow">
            + Register New Vehicle
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v, idx) => (
            <div
              key={v.id}
              style={{ animationDelay: `${idx * 60}ms` }}
              className="group animate-fade-in-up relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-300 hover:shadow-xl"
            >
              {/* Card Header Banner */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 border border-slate-200/60">
                      {v.registration_number}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                      {v.name_model}
                    </h3>
                  </div>
                  <Badge variant={VEHICLE_STATUS_VARIANTS[v.status] || "gray"} className="px-3 py-1 font-semibold">
                    <span className="flex items-center gap-1.5">
                      {v.status === VEHICLE_STATUS.ON_TRIP && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      )}
                      {statusLabel(v.status)}
                    </span>
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Category</span>
                    <p className="mt-0.5 font-semibold text-slate-700">{v.type}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Region / Yard</span>
                    <p className="mt-0.5 font-semibold text-slate-700">{v.region}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Max Payload</span>
                    <p className="mt-0.5 font-semibold text-slate-700">{v.max_load_capacity} kg</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Total Odometer</span>
                    <p className="mt-0.5 font-semibold text-slate-700">{Number(v.odometer).toLocaleString()} km</p>
                  </div>
                </div>

                {/* Progress bar visual for odometer utilization */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span>Odometer Usage Status</span>
                    <span>{Math.min(100, Math.round((v.odometer / 100000) * 100))}% of 100k km</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        v.odometer > 80000 ? "bg-red-500" : v.odometer > 40000 ? "bg-amber-500" : "bg-brand-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((v.odometer / 100000) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                <span className="text-xs font-semibold text-slate-500">
                  Cost: <span className="text-slate-900 font-bold">₹{Number(v.acquisition_cost || 0).toLocaleString()}</span>
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(v)}
                  className="rounded-lg bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600 hover:text-white hover:shadow-md"
                >
                  Edit / Manage →
                </button>
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
                  <th className="px-6 py-4">Registration</th>
                  <th className="px-6 py-4">Name / Model</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4">Odometer</th>
                  <th className="px-6 py-4">Region</th>
                  <th className="px-6 py-4">Acquisition Cost</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v, idx) => (
                  <tr
                    key={v.id}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className="animate-fade-in-up transition-colors hover:bg-indigo-50/30"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{v.registration_number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{v.name_model}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {v.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{v.max_load_capacity} kg</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{Number(v.odometer).toLocaleString()} km</td>
                    <td className="px-6 py-4 text-slate-600">{v.region}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">₹{Number(v.acquisition_cost || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <Badge variant={VEHICLE_STATUS_VARIANTS[v.status] || "gray"} className="px-2.5 py-1 font-semibold">
                        {statusLabel(v.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-1 text-xs font-bold text-brand-600 transition-all hover:bg-brand-600 hover:text-white"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Vehicle: ${editing.registration_number}` : "Register New Fleet Asset"}
      >
        <VehicleForm
          initialValues={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
