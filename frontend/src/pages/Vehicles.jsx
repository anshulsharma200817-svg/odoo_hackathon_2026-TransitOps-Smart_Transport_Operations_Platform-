import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import { listVehicles, createVehicle, updateVehicle, VEHICLE_STATUSES } from "../api/vehicles";
import { VEHICLE_STATUS_VARIANTS } from "../lib/statusVariants";

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
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="animate-fade-in-up rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <Input
        label="Registration number"
        required
        value={form.registration_number}
        onChange={(e) => update("registration_number", e.target.value)}
        placeholder="VAN-05"
      />
      <Input
        label="Name / model"
        required
        value={form.name_model}
        onChange={(e) => update("name_model", e.target.value)}
        placeholder="Tata Ace"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Type"
          required
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          placeholder="Van, Truck..."
        />
        <Input
          label="Region"
          required
          value={form.region}
          onChange={(e) => update("region", e.target.value)}
          placeholder="North"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Max load capacity (kg)"
          type="number"
          min="0"
          required
          value={form.max_load_capacity}
          onChange={(e) => update("max_load_capacity", e.target.value)}
        />
        <Input
          label="Odometer (km)"
          type="number"
          min="0"
          required
          value={form.odometer}
          onChange={(e) => update("odometer", e.target.value)}
        />
      </div>
      <Input
        label="Acquisition cost"
        type="number"
        min="0"
        required
        value={form.acquisition_cost}
        onChange={(e) => update("acquisition_cost", e.target.value)}
      />
      <Select label="Status" value={form.status} onChange={(e) => update("status", e.target.value)}>
        {VEHICLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <div className="mt-2 flex gap-3">
        <Button type="submit" loading={saving} className="flex-1">
          {saving ? "Saving…" : "Save vehicle"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
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

  async function load() {
    setLoading(true);
    try {
      const data = await listVehicles();
      setVehicles(data);
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
      vehicles.filter(
        (v) =>
          (!statusFilter || v.status === statusFilter) &&
          (!typeFilter || v.type === typeFilter) &&
          (!regionFilter || v.region === regionFilter),
      ),
    [vehicles, statusFilter, typeFilter, regionFilter],
  );

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
      showToast("Vehicle updated");
    } else {
      await createVehicle(values);
      showToast("Vehicle created");
    }
    setModalOpen(false);
    load();
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Vehicles</h1>
        <Button onClick={openCreate}>Add vehicle</Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Select
          className="w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select className="w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          className="w-36"
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading vehicles…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
          No vehicles match these filters.
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Registration</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Odometer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((v) => (
                  <tr key={v.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{v.registration_number}</td>
                    <td className="px-4 py-3 text-slate-600">{v.name_model}</td>
                    <td className="px-4 py-3 text-slate-600">{v.type}</td>
                    <td className="px-4 py-3 text-slate-600">{v.region}</td>
                    <td className="px-4 py-3 text-slate-600">{v.max_load_capacity} kg</td>
                    <td className="px-4 py-3 text-slate-600">{v.odometer} km</td>
                    <td className="px-4 py-3">
                      <Badge variant={VEHICLE_STATUS_VARIANTS[v.status] || "gray"}>{v.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(v)}
                        className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-colors"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{v.registration_number}</p>
                    <p className="text-sm text-slate-500">{v.name_model}</p>
                  </div>
                  <Badge variant={VEHICLE_STATUS_VARIANTS[v.status] || "gray"}>{v.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span>{v.type}</span>
                  <span>{v.region}</span>
                  <span>{v.max_load_capacity} kg cap.</span>
                  <span>{v.odometer} km</span>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(v)}
                  className="mt-3 text-sm font-medium text-brand-600"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit vehicle" : "Add vehicle"}
      >
        <VehicleForm
          initialValues={editing || EMPTY_FORM}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
