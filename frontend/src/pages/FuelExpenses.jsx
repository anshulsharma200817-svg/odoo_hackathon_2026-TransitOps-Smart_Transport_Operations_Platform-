import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import { useToast } from "../components/ui/ToastProvider";
import {
  listFuelLogs,
  createFuelLog,
  listExpenses,
  createExpense,
  EXPENSE_TYPES,
} from "../api/fuelExpenses";
import { listVehicles } from "../api/vehicles";
import { IconFuel, IconTruck, IconChart } from "../components/icons";

function CreateFuelForm({ vehicles, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    vehicle: "",
    liters: "",
    cost: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vehicles.length > 0 && !form.vehicle) {
      setForm((f) => ({ ...f, vehicle: vehicles[0].id || vehicles[0].registration_number }));
    }
  }, [vehicles]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!form.vehicle || !form.liters || !form.cost || !form.date) {
        throw new Error("Please fill out all fuel log fields");
      }
      if (Number(form.liters) <= 0 || Number(form.cost) < 0) {
        throw new Error("Liters must be positive and cost cannot be negative");
      }
      await onSubmit({
        ...form,
        liters: Number(form.liters),
        cost: Number(form.cost),
      });
    } catch (err) {
      setError(err.message || "Could not log fuel entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-4 animate-scale-in" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Select Vehicle
        </label>
        {vehicles.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 font-medium">
            No vehicles registered in fleet yet.
          </div>
        ) : (
          <select
            value={form.vehicle}
            onChange={(e) => update("vehicle", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            required
          >
            {vehicles.map((v) => (
              <option key={v.id || v.registration_number} value={v.id || v.registration_number}>
                {v.registration_number} ({v.name_model} · {v.type})
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Fuel Quantity (Liters)"
          type="number"
          min="0.1"
          step="0.1"
          required
          value={form.liters}
          onChange={(e) => update("liters", e.target.value)}
          placeholder="e.g. 45.5"
        />
        <Input
          label="Total Cost (₹)"
          type="number"
          min="0"
          required
          value={form.cost}
          onChange={(e) => update("cost", e.target.value)}
          placeholder="e.g. 4200"
        />
      </div>
      <Input
        label="Date Refueled"
        type="date"
        required
        value={form.date}
        onChange={(e) => update("date", e.target.value)}
      />
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={saving}
          disabled={vehicles.length === 0}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-glow hover:shadow-glow-lg transition-all"
        >
          {saving ? "Logging…" : "Log Fuel Entry"}
        </Button>
      </div>
    </form>
  );
}

function CreateExpenseForm({ vehicles, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    vehicle: "",
    type: "TOLL",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vehicles.length > 0 && !form.vehicle) {
      setForm((f) => ({ ...f, vehicle: vehicles[0].id || vehicles[0].registration_number }));
    }
  }, [vehicles]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!form.vehicle || !form.type || !form.amount || !form.date) {
        throw new Error("Please fill out all operational expense fields");
      }
      if (Number(form.amount) < 0) {
        throw new Error("Expense amount cannot be negative");
      }
      await onSubmit({
        ...form,
        amount: Number(form.amount),
      });
    } catch (err) {
      setError(err.message || "Could not log operational expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-4 animate-scale-in" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Select Vehicle
        </label>
        {vehicles.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 font-medium">
            No vehicles registered yet.
          </div>
        ) : (
          <select
            value={form.vehicle}
            onChange={(e) => update("vehicle", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            required
          >
            {vehicles.map((v) => (
              <option key={v.id || v.registration_number} value={v.id || v.registration_number}>
                {v.registration_number} ({v.name_model} · {v.type})
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
          Operational Expense Category
        </label>
        <select
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {EXPENSE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label} ({t.value === "MAINTENANCE" ? "Excl. from Other bucket in ROI formula" : "Standard operational expense"})
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-slate-500">
          💡 Note: Maintenance-type expenses are handled specially by the backend operational cost formula (`Hour 3 / Hour 4 contract`) to avoid double counting against direct workshop logs.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Amount (₹)"
          type="number"
          min="0"
          required
          value={form.amount}
          onChange={(e) => update("amount", e.target.value)}
          placeholder="e.g. 850"
        />
        <Input
          label="Expense Date"
          type="date"
          required
          value={form.date}
          onChange={(e) => update("date", e.target.value)}
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={saving}
          disabled={vehicles.length === 0}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-glow hover:shadow-glow-lg transition-all"
        >
          {saving ? "Logging…" : "Log Expense Item"}
        </Button>
      </div>
    </form>
  );
}

export default function FuelExpenses() {
  const [activeTab, setActiveTab] = useState("fuel"); // "fuel" | "expenses"
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("");
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const showToast = useToast();

  async function loadAll() {
    setLoading(true);
    try {
      const [fData, eData, vData] = await Promise.all([
        listFuelLogs().catch(() => []),
        listExpenses().catch(() => []),
        listVehicles().catch(() => []),
      ]);
      setFuelLogs(fData || []);
      setExpenses(eData || []);
      setVehicles(vData || []);
    } catch (err) {
      showToast(err.message || "Failed to load fuel & expense telemetry", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreateFuel(values) {
    await createFuelLog(values);
    showToast("Fuel log entry added successfully!");
    setFuelModalOpen(false);
    loadAll();
  }

  async function handleCreateExpense(values) {
    await createExpense(values);
    showToast("Operational expense logged successfully!");
    setExpenseModalOpen(false);
    loadAll();
  }

  const getVehicleDisplay = (item) => {
    if (item.vehicle_display) return item.vehicle_display;
    const v = vehicles.find(
      (vItem) =>
        String(vItem.id) === String(item.vehicle) ||
        String(vItem.registration_number) === String(item.vehicle)
    );
    return v ? `${v.registration_number} (${v.name_model})` : `Vehicle #${item.vehicle}`;
  };

  const filteredFuel = useMemo(() => {
    return fuelLogs.filter((log) => {
      if (!searchQuery) return true;
      return getVehicleDisplay(log).toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [fuelLogs, searchQuery, vehicles]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesType = !expenseTypeFilter || item.type?.toUpperCase() === expenseTypeFilter.toUpperCase();
      const matchesSearch =
        !searchQuery ||
        getVehicleDisplay(item).toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [expenses, expenseTypeFilter, searchQuery, vehicles]);

  // Telemetry Aggregations
  const totalLiters = fuelLogs.reduce((acc, f) => acc + (Number(f.liters) || 0), 0);
  const totalFuelCost = fuelLogs.reduce((acc, f) => acc + (Number(f.cost) || 0), 0);
  const totalExpenseAmount = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const tollExpensesCount = expenses.filter((e) => e.type?.toUpperCase() === "TOLL").length;

  return (
    <div className="min-h-full space-y-8 p-4 sm:p-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-glow">
              <IconFuel className="h-5 w-5 animate-pulse-subtle" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Fuel Telemetry & Operational Expenses
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Log fuel consumption in liters, record toll/maintenance expenses, and audit fleet operational overhead.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "fuel" ? (
            <Button
              onClick={() => setFuelModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 shadow-glow hover:scale-[1.02] transition-all"
            >
              <span className="text-lg leading-none">+</span> Log Fuel Entry
            </Button>
          ) : (
            <Button
              onClick={() => setExpenseModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 shadow-glow hover:scale-[1.02] transition-all"
            >
              <span className="text-lg leading-none">+</span> Log New Expense
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => setActiveTab("fuel")}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            activeTab === "fuel"
              ? "border-emerald-500/40 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/30 shadow-md ring-2 ring-emerald-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total Fuel Consumed</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <IconFuel className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">{totalLiters.toFixed(1)} L</span>
            <span className="text-xs font-semibold text-emerald-600">Across {fuelLogs.length} fill-ups</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("fuel")}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            activeTab === "fuel"
              ? "border-teal-500/40 bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/30 shadow-md ring-2 ring-teal-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Cumulative Fuel Spend</span>
            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-600">
              Cost
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">₹{totalFuelCost.toLocaleString()}</span>
            <span className="text-xs font-semibold text-slate-500">
              Avg ₹{totalLiters ? (totalFuelCost / totalLiters).toFixed(1) : 0}/L
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab("expenses")}
          className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl ${
            activeTab === "expenses"
              ? "border-purple-500/40 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/30 shadow-md ring-2 ring-purple-500/20"
              : "border-slate-200/80 bg-white/90 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Total Operational Expenses</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <IconChart className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">₹{totalExpenseAmount.toLocaleString()}</span>
            <span className="text-xs font-semibold text-purple-600">{expenses.length} logs ({tollExpensesCount} tolls)</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      {/* Tab Selector & Filters Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1 border border-slate-200/60">
          <button
            onClick={() => {
              setActiveTab("fuel");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 ${
              activeTab === "fuel"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <IconFuel className="h-4 w-4" />
            Fuel & Mileage Logs ({fuelLogs.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("expenses");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200 ${
              activeTab === "expenses"
                ? "bg-white text-purple-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <IconChart className="h-4 w-4" />
            Operational Expenses ({expenses.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search vehicle${activeTab === "expenses" ? " or type" : ""}...`}
              className="w-full text-sm"
            />
          </div>
          {activeTab === "expenses" && (
            <Select
              className="w-44 text-sm"
              value={expenseTypeFilter}
              onChange={(e) => setExpenseTypeFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {EXPENSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
          {(searchQuery || expenseTypeFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setExpenseTypeFilter("");
              }}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors px-2 py-1 underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/60 p-6" />
          ))}
        </div>
      ) : activeTab === "fuel" ? (
        /* FUEL LOGS VIEW */
        filteredFuel.length === 0 ? (
          <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 py-16 px-6 text-center shadow-sm">
            <IconFuel className="h-10 w-10 text-emerald-600 mb-3 opacity-80" />
            <h3 className="text-lg font-bold text-slate-900">No fuel logs found</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Log your fleet's diesel or petrol fill-ups to track cost per liter and mileage.
            </p>
            <Button onClick={() => setFuelModalOpen(true)} className="mt-6 bg-emerald-600 shadow-glow">
              + Log Fuel Entry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFuel.map((log, idx) => (
              <div
                key={log.id}
                style={{ animationDelay: `${idx * 40}ms` }}
                className="group animate-fade-in-up relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-400 hover:shadow-xl"
              >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-sm">
                      <IconTruck className="h-4 w-4 text-emerald-600" />
                      {getVehicleDisplay(log)}
                    </span>
                    <Badge variant="green" className="px-2.5 py-0.5 text-xs font-bold">
                      Refuel
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-emerald-50/50 p-3.5 border border-emerald-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Quantity</span>
                      <span className="text-lg font-extrabold text-slate-900">{log.liters} L</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Unit Rate</span>
                      <span className="text-lg font-extrabold text-emerald-700">
                        ₹{(Number(log.cost) / (Number(log.liters) || 1)).toFixed(1)}/L
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-500 font-medium">Refueled: <strong className="text-slate-800">{log.date}</strong></span>
                  <span className="text-base font-extrabold text-slate-900">₹{Number(log.cost).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* EXPENSES VIEW */
        filteredExpenses.length === 0 ? (
          <div className="animate-fade-in-up flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 py-16 px-6 text-center shadow-sm">
            <IconChart className="h-10 w-10 text-purple-600 mb-3 opacity-80" />
            <h3 className="text-lg font-bold text-slate-900">No operational expenses found</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Record toll charges, workshop supplies, or permit costs for your vehicles.
            </p>
            <Button onClick={() => setExpenseModalOpen(true)} className="mt-6 bg-purple-600 shadow-glow">
              + Log New Expense
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredExpenses.map((exp, idx) => {
              const badgeVariant =
                exp.type?.toUpperCase() === "TOLL"
                  ? "blue"
                  : exp.type?.toUpperCase() === "MAINTENANCE"
                  ? "amber"
                  : "purple";
              return (
                <div
                  key={exp.id}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="group animate-fade-in-up relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-purple-400 hover:shadow-xl"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      badgeVariant === "blue"
                        ? "bg-blue-500"
                        : badgeVariant === "amber"
                        ? "bg-amber-500"
                        : "bg-purple-500"
                    }`}
                  />
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-sm">
                        <IconTruck className="h-4 w-4 text-purple-600" />
                        {getVehicleDisplay(exp)}
                      </span>
                      <Badge variant={badgeVariant} className="px-2.5 py-0.5 text-xs font-bold uppercase">
                        {exp.type}
                      </Badge>
                    </div>

                    <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600">
                      {exp.type?.toUpperCase() === "MAINTENANCE" ? (
                        <span className="text-amber-800 font-semibold">
                          🔧 Maintenance Expense Item (Excluded from "Other" bucket per ROI formula)
                        </span>
                      ) : exp.type?.toUpperCase() === "TOLL" ? (
                        <span className="text-blue-800 font-semibold">
                          🛣️ Highway / Checkpoint Toll Charge
                        </span>
                      ) : (
                        <span className="text-purple-800 font-semibold">
                          📋 General Operational Overhead Item
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500 font-medium">Logged: <strong className="text-slate-800">{exp.date}</strong></span>
                    <span className="text-base font-extrabold text-slate-900">₹{Number(exp.amount).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Fuel Log Modal */}
      <Modal open={fuelModalOpen} onClose={() => setFuelModalOpen(false)} title="Log Fuel Consumption">
        <CreateFuelForm
          vehicles={vehicles}
          onSubmit={handleCreateFuel}
          onCancel={() => setFuelModalOpen(false)}
        />
      </Modal>

      {/* Expense Modal */}
      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Log Operational Expense">
        <CreateExpenseForm
          vehicles={vehicles}
          onSubmit={handleCreateExpense}
          onCancel={() => setExpenseModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
