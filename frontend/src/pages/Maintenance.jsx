import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import { listMaintenanceLogs, createMaintenanceLog, closeMaintenanceLog } from "../api/maintenance";
import { listVehicles } from "../api/vehicles";
import { MAINTENANCE_STATUS_VARIANTS, VEHICLE_STATUS_VARIANTS } from "../lib/statusVariants";
import { IconWrench, IconTruck } from "../components/icons";

const EMPTY_FORM = {
  vehicle: "",
  description: "",
  cost: "",
  date_opened: new Date().toISOString().split("T")[0],
};

function CreateMaintenanceForm({ vehicles, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter out retired vehicles for new maintenance logs per contract constraint
  const eligibleVehicles = useMemo(
    () => vehicles.filter((v) => v.status !== "Retired" && v.status !== "RETIRED"),
    [vehicles]
  );

  useEffect(() => {
    if (eligibleVehicles.length > 0 && !form.vehicle) {
      setForm((f) => ({ ...f, vehicle: eligibleVehicles[0].id || eligibleVehicles[0].registration_number }));
    }
  }, [eligibleVehicles]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!form.vehicle || !form.description || !form.date_opened) {
        throw new Error("Please fill out all required fields (Vehicle, Description, Date Opened)");
      }
      await onSubmit({
        ...form,
        cost: Number(form.cost || 0),
      });
    } catch (err) {
      setError(err.message || "Could not create maintenance log");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-4 animate-scale-in" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 shadow-sm">
          {error}
        </div>
      )}
      <div className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200/80 text-xs text-amber-900 font-medium">
        ⚡ Creating a maintenance log will immediately transition the selected vehicle to <span className="font-bold">In Shop</span> status and remove it from the available vehicles pool for trip dispatches.
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Select Vehicle for Maintenance
        </label>
        {eligibleVehicles.length === 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 font-medium">
            No eligible vehicles available for maintenance. Retired vehicles cannot have maintenance records opened.
          </div>
        ) : (
          <select
            value={form.vehicle}
            onChange={(e) => update("vehicle", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            required
          >
            {eligibleVehicles.map((v) => (
              <option key={v.id || v.registration_number} value={v.id || v.registration_number}>
                {v.registration_number} ({v.name_model} · Current Status: {v.status})
              </option>
            ))}
          </select>
        )}
      </div>
      <Input
        label="Service / Repair Description"
        required
        value={form.description}
        onChange={(e) => update("description", e.target.value)}
        placeholder="e.g. Brake fluid replacement and transmission overhaul"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Estimated or Actual Cost (₹)"
          type="number"
          min="0"
          value={form.cost}
          onChange={(e) => update("cost", e.target.value)}
          placeholder="e.g. 4500"
        />
        <Input
          label="Date Opened"
          type="date"
          required
          value={form.date_opened}
          onChange={(e) => update("date_opened", e.target.value)}
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={saving}
          disabled={eligibleVehicles.length === 0}
          className="bg-gradient-to-r from-brand-600 to-amber-600 shadow-glow hover:shadow-glow-lg transition-all"
        >
          {saving ? "Opening Log…" : "Open Maintenance Log"}
        </Button>
      </div>
    </form>
  );
}

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [closingLog, setClosingLog] = useState(null);
  const [closingLoading, setClosingLoading] = useState(false);
  const showToast = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [lData, vData] = await Promise.all([
        listMaintenanceLogs().catch(() => []),
        listVehicles().catch(() => []),
      ]);
      setLogs(lData || []);
      setVehicles(vData || []);
    } catch (err) {
      showToast(err.message || "Failed to load maintenance records", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(values) {
    await createMaintenanceLog(values);
    showToast("Maintenance log opened! Vehicle status transitioned to In Shop.");
    setCreateModalOpen(false);
    loadData();
  }

  async function handleCloseConfirm() {
    if (!closingLog) return;
    setClosingLoading(true);
    try {
      const result = await closeMaintenanceLog(closingLog.id);
      setClosingLog(null);
      await loadData();

      const vStatus = result._vehicleStatus;
      const vReg = result._vehicleRegistration || "Vehicle";
      if (vStatus === "Retired" || vStatus === "RETIRED") {
        showToast(
          `Log closed. Note: Vehicle ${vReg} remains in Retired status and was not restored to Available.`,
          "error"
        );
      } else {
        showToast(`Maintenance log closed! Vehicle ${vReg} restored to Available status.`);
      }
    } catch (err) {
      showToast(err.message || "Could not close maintenance log", "error");
    } finally {
      setClosingLoading(false);
    }
  }

  // Lookup helper for vehicle displays
  const getVehicleDisplay = (log) => {
    if (log.vehicle_display) return log.vehicle_display;
    const v = vehicles.find(
      (item) =>
        String(item.id) === String(log.vehicle) ||
        String(item.registration_number) === String(log.vehicle)
    );
    return v ? `${v.registration_number} (${v.name_model})` : `Vehicle #${log.vehicle}`;
  };

  const getVehicleObj = (log) => {
    return vehicles.find(
      (item) =>
        String(item.id) === String(log.vehicle) ||
        String(item.registration_number) === String(log.vehicle)
    );
  };

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesStatus =
        !statusFilter ||
        log.status?.toUpperCase() === statusFilter.toUpperCase();
      const matchesSearch =
        !searchQuery ||
        getVehicleDisplay(log).toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [logs, statusFilter, searchQuery, vehicles]);

  // KPI calculations
  const totalLogsCount = logs.length;
  const openLogsCount = logs.filter((l) => l.status?.toUpperCase() === "OPEN").length;
  const closedLogsCount = logs.filter((l) => l.status?.toUpperCase() === "CLOSED").length;
  const totalCost = logs.reduce((acc, l) => acc + (Number(l.cost) || 0), 0);

  const closingVehicleObj = closingLog ? getVehicleObj(closingLog) : null;
  const isClosingRetired =
    closingVehicleObj?.status === "Retired" || closingVehicleObj?.status === "RETIRED";

  return (
    <div className="min-h-full space-y-8 p-4 sm:p-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-amber-600 text-white shadow-glow">
              <IconWrench className="h-5 w-5 animate-pulse-subtle" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Fleet Maintenance & Repair Logs
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Track service history, log repair costs, and transition vehicles to/from active workshop maintenance.
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-amber-600 px-5 py-2.5 shadow-glow hover:scale-[1.02] hover:shadow-glow-lg transition-all duration-300"
        >
          <span className="text-lg leading-none">+</span> Open Maintenance Log
        </Button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => setStatusFilter("")}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === ""
              ? "border-brand-500/40 bg-gradient-to-br from-brand-50/80 via-white to-amber-50/30 shadow-md ring-2 ring-brand-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Maintenance Records</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <IconWrench className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{totalLogsCount}</span>
            <span className="text-xs font-semibold text-indigo-600">All service history</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-brand-500 to-amber-600 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "OPEN" ? "" : "OPEN")}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === "OPEN"
              ? "border-amber-500/40 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 shadow-md ring-2 ring-amber-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Active In Shop</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{openLogsCount}</span>
            <span className="text-xs font-semibold text-amber-600">Open service orders</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${totalLogsCount ? (openLogsCount / totalLogsCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "CLOSED" ? "" : "CLOSED")}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === "CLOSED"
              ? "border-emerald-500/40 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 shadow-md ring-2 ring-emerald-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed Service</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              ✓
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{closedLogsCount}</span>
            <span className="text-xs font-semibold text-emerald-600">Resolved logs</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${totalLogsCount ? (closedLogsCount / totalLogsCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Total Maintenance Cost</span>
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-600">
              Spend
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">₹{totalCost.toLocaleString()}</span>
            <span className="text-xs font-semibold text-slate-500">Cumulative</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-amber-500 to-purple-600 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle or service description..."
              className="w-full text-sm"
            />
          </div>
          <Select
            className="w-44 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
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
        <div className="text-xs font-semibold text-slate-500 self-end sm:self-auto">
          Showing <span className="text-slate-900 font-bold">{filtered.length}</span> of {logs.length} logs
        </div>
      </div>

      {/* Main Content List / Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 p-6" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 py-16 px-6 text-center shadow-sm backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner mb-4">
            <IconWrench className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No matching maintenance logs found</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Try adjusting your search query or open a new maintenance log for a vehicle needing repairs.
          </p>
          <Button onClick={() => setCreateModalOpen(true)} className="mt-6 bg-brand-600 shadow-glow">
            + Open Maintenance Log
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((log, idx) => {
            const isOpen = log.status?.toUpperCase() === "OPEN";
            return (
              <div
                key={log.id}
                style={{ animationDelay: `${idx * 50}ms` }}
                className="group animate-fade-in-up relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300 hover:shadow-xl"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 transition-opacity ${
                    isOpen ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />

                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-800 text-sm">
                      <IconTruck className="h-4 w-4 text-brand-600 shrink-0" />
                      <span>{getVehicleDisplay(log)}</span>
                    </div>
                    <Badge
                      variant={isOpen ? "amber" : "green"}
                      className="px-2.5 py-1 font-semibold shrink-0"
                    >
                      <span className="flex items-center gap-1.5">
                        {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />}
                        {log.status}
                      </span>
                    </Badge>
                  </div>

                  <p className="mt-3 text-sm text-slate-700 font-medium line-clamp-3 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    "{log.description}"
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-slate-400 block font-medium">Date Opened</span>
                      <span className="font-bold text-slate-800">{log.date_opened || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Date Closed</span>
                      <span className="font-bold text-slate-800">{log.date_closed || (isOpen ? "Active In Shop" : "-")}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-slate-400 font-medium">Cost:</span>
                    <span className="text-base font-extrabold text-slate-900">
                      ₹{(Number(log.cost) || 0).toLocaleString()}
                    </span>
                  </div>

                  {isOpen ? (
                    <button
                      type="button"
                      onClick={() => setClosingLog(log)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-glow transition-all hover:scale-105 active:scale-[0.97]"
                    >
                      ✓ Close Log
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <span>Completed ✓</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Maintenance Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Open New Maintenance Record"
      >
        <CreateMaintenanceForm
          vehicles={vehicles}
          onSubmit={handleCreate}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      {/* Close Log Confirmation Modal */}
      <Modal
        open={Boolean(closingLog)}
        onClose={() => !closingLoading && setClosingLog(null)}
        title="Confirm Closing Maintenance Log"
      >
        {closingLog && (
          <div className="flex flex-col gap-4 animate-scale-in">
            <p className="text-sm text-slate-600">
              Are you sure you want to close the maintenance record for{" "}
              <span className="font-bold text-slate-900">{getVehicleDisplay(closingLog)}</span>?
            </p>
            <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700 border border-slate-200">
              <span className="font-bold block text-slate-900 mb-1">Service Description:</span>
              "{closingLog.description}" (Cost: ₹{(Number(closingLog.cost) || 0).toLocaleString()})
            </div>

            {isClosingRetired ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-bold text-amber-900">
                ⚠️ NOTICE: Vehicle <span className="underline">{getVehicleDisplay(closingLog)}</span> is currently in <span className="text-red-700 uppercase">RETIRED</span> status. Closing this maintenance record will <span className="underline">NOT</span> restore it to Available status. It will remain Retired.
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs font-medium text-emerald-900">
                ⚡ Closing this log will immediately restore vehicle <span className="font-bold">{getVehicleDisplay(closingLog)}</span> to <span className="font-bold text-emerald-700">Available</span> status, returning it to the active fleet for trip creation!
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={closingLoading}
                onClick={() => setClosingLog(null)}
              >
                Keep Open
              </Button>
              <button
                type="button"
                disabled={closingLoading}
                onClick={handleCloseConfirm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-glow transition-all hover:bg-emerald-700 active:scale-[0.97] disabled:opacity-50"
              >
                {closingLoading ? "Closing…" : "Yes, Close Maintenance Log"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
