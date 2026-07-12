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
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="animate-fade-in-up rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <Input
        label="Full name"
        required
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        placeholder="Alex Carter"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="License number"
          required
          value={form.license_number}
          onChange={(e) => update("license_number", e.target.value)}
        />
        <Input
          label="License category"
          required
          value={form.license_category}
          onChange={(e) => update("license_category", e.target.value)}
          placeholder="LMV / HMV"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="License expiry"
          type="date"
          required
          value={form.license_expiry_date}
          onChange={(e) => update("license_expiry_date", e.target.value)}
        />
        <Input
          label="Contact number"
          required
          value={form.contact_number}
          onChange={(e) => update("contact_number", e.target.value)}
        />
      </div>
      <Input
        label="Safety score"
        type="number"
        min="0"
        max="100"
        required
        value={form.safety_score}
        onChange={(e) => update("safety_score", e.target.value)}
      />
      <Select label="Status" value={form.status} onChange={(e) => update("status", e.target.value)}>
        {DRIVER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <div className="mt-2 flex gap-3">
        <Button type="submit" loading={saving} className="flex-1">
          {saving ? "Saving…" : "Save driver"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
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

  async function load() {
    setLoading(true);
    try {
      const data = await listDrivers();
      setDrivers(data);
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
    () => drivers.filter((d) => !statusFilter || d.status === statusFilter),
    [drivers, statusFilter],
  );

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
      showToast("Driver updated");
    } else {
      await createDriver(values);
      showToast("Driver created");
    }
    setModalOpen(false);
    load();
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Drivers</h1>
        <Button onClick={openCreate}>Add driver</Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Select
          className="w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {DRIVER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading drivers…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
          No drivers match these filters.
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Safety score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => {
                  const expired = isLicenseExpired(d);
                  return (
                    <tr key={d.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                      <td className="px-4 py-3 text-slate-600">{d.license_number}</td>
                      <td className="px-4 py-3 text-slate-600">{d.license_category}</td>
                      <td
                        className={`px-4 py-3 ${expired ? "font-medium text-red-600" : "text-slate-600"}`}
                      >
                        {d.license_expiry_date}
                        {expired && " (expired)"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{d.contact_number}</td>
                      <td className="px-4 py-3 text-slate-600">{d.safety_score}</td>
                      <td className="px-4 py-3">
                        <Badge variant={DRIVER_STATUS_VARIANTS[d.status] || "gray"}>{d.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(d)}
                          className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((d) => {
              const expired = isLicenseExpired(d);
              return (
                <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{d.name}</p>
                      <p className="text-sm text-slate-500">{d.license_number}</p>
                    </div>
                    <Badge variant={DRIVER_STATUS_VARIANTS[d.status] || "gray"}>{d.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span>{d.license_category}</span>
                    <span className={expired ? "font-medium text-red-600" : ""}>
                      {d.license_expiry_date}
                      {expired && " (expired)"}
                    </span>
                    <span>{d.contact_number}</span>
                    <span>Score: {d.safety_score}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
                    className="mt-3 text-sm font-medium text-brand-600"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit driver" : "Add driver"}
      >
        <DriverForm
          initialValues={editing || EMPTY_FORM}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
