import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import {
  listDrivers,
  createDriver,
  updateDriver,
  isLicenseExpired,
  DRIVER_STATUSES,
} from "../api/drivers";
import { DRIVER_STATUS_VARIANTS } from "../lib/statusVariants";
import { DRIVER_STATUS, statusLabel } from "../lib/enumLabels";
import { IconUser } from "../components/icons";

const EMPTY_FORM = {
  name: "",
  license_number: "",
  license_category: "",
  license_expiry_date: "",
  contact_number: "",
  safety_score: "",
  status: DRIVER_STATUSES[0],
};

function DriverForm({ initialValues, onSubmit, onCancel }) {
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
      await onSubmit({ ...form, safety_score: Number(form.safety_score) });
    } catch (err) {
      setError(err.message || "Could not save driver");
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
          label="Full Name"
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Rajesh Kumar or Alex Carter"
        />
        <Input
          label="License Number"
          required
          value={form.license_number}
          onChange={(e) => update("license_number", e.target.value)}
          placeholder="e.g. DL-1420110012345"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="License Category"
          required
          value={form.license_category}
          onChange={(e) => update("license_category", e.target.value)}
          placeholder="HMV, LMV, Transport..."
        />
        <Input
          label="Expiry Date (YYYY-MM-DD)"
          type="date"
          required
          value={form.license_expiry_date}
          onChange={(e) => update("license_expiry_date", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Contact Number"
          required
          value={form.contact_number}
          onChange={(e) => update("contact_number", e.target.value)}
          placeholder="e.g. +91 98765 43210"
        />
        <Input
          label="Safety Score (0 - 100)"
          type="number"
          min="0"
          max="100"
          required
          value={form.safety_score}
          onChange={(e) => update("safety_score", e.target.value)}
          placeholder="e.g. 95"
        />
      </div>
      <div>
        <Select
          label="Driver Status"
          value={form.status}
          onChange={(e) => update("status", e.target.value)}
        >
          {DRIVER_STATUSES.map((s) => (
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
          {saving ? "Saving…" : initialValues ? "Save Changes" : "Onboard Driver"}
        </Button>
      </div>
    </form>
  );
}

export default function Drivers() {
  const showToast = useToast();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or table
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await listDrivers();
      setDrivers(data || []);
    } catch {
      showToast("Could not load drivers", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      drivers.filter((d) => {
        const matchesStatus = !statusFilter || d.status === statusFilter;
        const matchesSearch =
          !searchQuery ||
          d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.license_number?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [drivers, statusFilter, searchQuery],
  );

  // Quick KPI metrics
  const totalDriversCount = drivers.length;
  const activeOnTripCount = drivers.filter((d) => d.status === DRIVER_STATUS.ON_TRIP).length;
  const expiredCount = drivers.filter((d) => isLicenseExpired(d)).length;
  const avgSafetyScore = totalDriversCount
    ? Math.round(drivers.reduce((acc, d) => acc + (Number(d.safety_score) || 0), 0) / totalDriversCount)
    : 0;

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(driver) {
    setEditing(driver);
    setModalOpen(true);
  }

  async function handleSubmit(values) {
    if (editing) {
      await updateDriver(editing.id, values);
      showToast("Driver profile updated successfully!");
    } else {
      await createDriver(values);
      showToast("New driver onboarded successfully!");
    }
    setModalOpen(false);
    load();
  }

  return (
    <div className="min-h-full space-y-8 p-4 sm:p-8">
      {/* Top Header with Gradient Accent */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-glow">
              <IconUser className="h-5 w-5 animate-pulse-subtle" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Driver Roster & Safety Compliance
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Monitor driver availability, safety telemetry scores, and license compliance verification.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 px-5 py-2.5 shadow-glow hover:scale-[1.02] hover:shadow-glow-lg transition-all duration-300"
        >
          <span className="text-lg leading-none">+</span> Onboard New Driver
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Roster</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <IconUser className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{totalDriversCount}</span>
            <span className="text-xs font-semibold text-indigo-600">Onboarded drivers</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === DRIVER_STATUS.ON_TRIP ? "" : DRIVER_STATUS.ON_TRIP)}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            statusFilter === DRIVER_STATUS.ON_TRIP
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
            <span className="text-xs font-semibold text-emerald-600">Fulfilling trips</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${totalDriversCount ? (activeOnTripCount / totalDriversCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Fleet Safety Index</span>
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-600">
              Avg Score
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{avgSafetyScore}</span>
            <span className="text-xs font-semibold text-slate-500">/ 100 PTS</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                avgSafetyScore >= 90 ? "bg-emerald-500" : avgSafetyScore >= 75 ? "bg-brand-500" : "bg-amber-500"
              }`}
              style={{ width: `${avgSafetyScore}%` }}
            />
          </div>
        </div>

        <div className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
          expiredCount > 0
            ? "border-red-300 bg-gradient-to-br from-red-50/90 via-white to-red-50/30"
            : "border-slate-200/80 bg-white/90"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${expiredCount > 0 ? "text-red-700" : "text-slate-500"}`}>
              License Alert
            </span>
            {expiredCount > 0 && (
              <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight ${expiredCount > 0 ? "text-red-600" : "text-slate-900"}`}>
              {expiredCount}
            </span>
            <span className="text-xs font-semibold text-slate-500">Expired / Action Req.</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${expiredCount > 0 ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${totalDriversCount ? (expiredCount / totalDriversCount) * 100 : 0}%` }}
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
              placeholder="Search driver name or license..."
              className="w-full text-sm"
            />
          </div>
          <Select
            className="w-44 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Driver Statuses</option>
            {DRIVER_STATUSES.map((s) => (
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
            <div key={n} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 p-6 shadow-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 py-16 px-6 text-center shadow-sm backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-brand-600 shadow-inner mb-4">
            <IconUser className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No matching drivers found</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Try adjusting your search filters or onboard a new driver to your active roster.
          </p>
          <Button onClick={openCreate} className="mt-6 bg-brand-600 shadow-glow">
            + Onboard New Driver
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d, idx) => {
            const expired = isLicenseExpired(d);
            return (
              <div
                key={d.id}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={`group animate-fade-in-up relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${
                  expired ? "border-red-300/80" : "border-slate-200/80 hover:border-brand-300"
                }`}
              >
                {/* Top Accent Gradient Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 transition-opacity ${
                    expired ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 via-purple-500 to-brand-500 opacity-80 group-hover:opacity-100"
                  }`}
                />

                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-brand-700 font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                        {d.name ? d.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "DR"}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {d.name}
                        </h3>
                        <p className="font-mono text-xs text-slate-500">{d.license_number}</p>
                      </div>
                    </div>
                    <Badge variant={DRIVER_STATUS_VARIANTS[d.status] || "gray"} className="px-3 py-1 font-semibold shrink-0">
                      <span className="flex items-center gap-1.5">
                        {d.status === DRIVER_STATUS.ON_TRIP && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        )}
                        {statusLabel(d.status)}
                      </span>
                    </Badge>
                  </div>

                  {/* License and Safety Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Category</span>
                      <p className="mt-0.5 font-bold text-slate-700">{d.license_category}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Expiry Status</span>
                      <p className={`mt-0.5 font-bold ${expired ? "text-red-600 flex items-center gap-1" : "text-slate-700"}`}>
                        {d.license_expiry_date}
                        {expired && " ⚠️"}
                      </p>
                    </div>
                    <div className="col-span-2 border-t border-slate-200/60 pt-2 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Safety Telemetry Index</span>
                      <span className={`font-bold ${
                        d.safety_score >= 90 ? "text-emerald-600" : d.safety_score >= 75 ? "text-brand-600" : "text-amber-600"
                      }`}>
                        {d.safety_score} / 100 PTS
                      </span>
                    </div>
                  </div>

                  {/* Safety Score Bar */}
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          d.safety_score >= 90 ? "bg-emerald-500" : d.safety_score >= 75 ? "bg-brand-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, Number(d.safety_score) || 0)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    📞 <span className="text-slate-800 font-mono">{d.contact_number}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
                    className="rounded-lg bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600 hover:text-white hover:shadow-md"
                  >
                    Manage Driver →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Driver Name</th>
                  <th className="px-6 py-4">License No.</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">License Expiry</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Safety Score</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d, idx) => {
                  const expired = isLicenseExpired(d);
                  return (
                    <tr
                      key={d.id}
                      style={{ animationDelay: `${idx * 40}ms` }}
                      className="animate-fade-in-up transition-colors hover:bg-indigo-50/30"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-brand-700">
                          {d.name ? d.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "DR"}
                        </span>
                        {d.name}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">{d.license_number}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{d.license_category}</td>
                      <td className={`px-6 py-4 font-medium ${expired ? "text-red-600 font-bold" : "text-slate-700"}`}>
                        {d.license_expiry_date}
                        {expired && " (Expired)"}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-700">{d.contact_number}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                            d.safety_score >= 90
                              ? "bg-emerald-50 text-emerald-700"
                              : d.safety_score >= 75
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {d.safety_score} / 100
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={DRIVER_STATUS_VARIANTS[d.status] || "gray"} className="px-2.5 py-1 font-semibold">
                          {statusLabel(d.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-1 text-xs font-bold text-brand-600 transition-all hover:bg-brand-600 hover:text-white"
                        >
                          Edit Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Driver Profile: ${editing.name}` : "Onboard New Driver to Roster"}
      >
        <DriverForm
          initialValues={editing}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
