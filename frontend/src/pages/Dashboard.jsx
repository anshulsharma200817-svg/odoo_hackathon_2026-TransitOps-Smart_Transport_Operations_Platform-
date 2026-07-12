import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { listVehicles, VEHICLE_STATUSES } from "../api/vehicles";
import { listTrips } from "../api/trips";
import { getDashboardSummary } from "../api/dashboard";
import Badge from "../components/ui/Badge";
import Select from "../components/ui/Select";
import { TRIP_STATUS_VARIANTS } from "../lib/statusVariants";
import { VEHICLE_STATUS, statusLabel } from "../lib/enumLabels";
import { IconRoute, IconTruck, IconUser, IconWrench } from "../components/icons";

const STATUS_COLORS = {
  [VEHICLE_STATUS.AVAILABLE]: "#10b981", // emerald
  [VEHICLE_STATUS.ON_TRIP]: "#3b82f6", // blue
  [VEHICLE_STATUS.IN_SHOP]: "#f59e0b", // amber
  [VEHICLE_STATUS.RETIRED]: "#64748b", // slate
};

const EMPTY_SUMMARY = {
  active_vehicles: 0,
  available_vehicles: 0,
  vehicles_in_maintenance: 0,
  active_trips: 0,
  pending_trips: 0,
  drivers_on_duty: 0,
  fleet_utilization_pct: 0,
};

import { getRole } from "../api/auth";
import DriverDashboard from "./DriverDashboard";

export default function Dashboard() {
  const role = getRole();
  if (role === "DRIVER") {
    return <DriverDashboard />;
  }

  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  // Vehicles/trips are fetched once (unfiltered) - the donut, weekly chart,
  // and recent-trips list all need the full picture. Only the /dashboard/
  // summary itself is re-fetched per filter, matching what the endpoint
  // actually supports.
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [vList, tList] = await Promise.all([
          listVehicles().catch(() => []),
          listTrips().catch(() => []),
        ]);
        if (mounted) {
          setVehicles(vList || []);
          setTrips(tList || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getDashboardSummary({ type: typeFilter, status: statusFilter, region: regionFilter })
      .catch(() => EMPTY_SUMMARY)
      .then((data) => {
        if (mounted) setSummary(data || EMPTY_SUMMARY);
      });
    return () => {
      mounted = false;
    };
  }, [typeFilter, statusFilter, regionFilter]);

  const types = useMemo(
    () => [...new Set(vehicles.map((v) => v.type).filter(Boolean))],
    [vehicles],
  );
  const regions = useMemo(
    () => [...new Set(vehicles.map((v) => v.region).filter(Boolean))],
    [vehicles],
  );

  // Fleet Status donut: scoped by the same filters as the summary, so both
  // stay consistent. /dashboard/ deliberately excludes Retired vehicles
  // from its own counts, so this still needs the raw vehicle list.
  const filteredVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (!typeFilter || v.type === typeFilter) &&
          (!statusFilter || v.status === statusFilter) &&
          (!regionFilter || v.region === regionFilter),
      ),
    [vehicles, typeFilter, statusFilter, regionFilter],
  );

  const totalVehicles = filteredVehicles.length;
  const availableCount = filteredVehicles.filter((v) => v.status === VEHICLE_STATUS.AVAILABLE).length;
  const onTripCount = filteredVehicles.filter((v) => v.status === VEHICLE_STATUS.ON_TRIP).length;
  const inShopCount = filteredVehicles.filter((v) => v.status === VEHICLE_STATUS.IN_SHOP).length;
  const retiredCount = filteredVehicles.filter((v) => v.status === VEHICLE_STATUS.RETIRED).length;

  const pieData = [
    { name: statusLabel(VEHICLE_STATUS.AVAILABLE), value: availableCount, color: STATUS_COLORS[VEHICLE_STATUS.AVAILABLE] },
    { name: statusLabel(VEHICLE_STATUS.ON_TRIP), value: onTripCount, color: STATUS_COLORS[VEHICLE_STATUS.ON_TRIP] },
    { name: statusLabel(VEHICLE_STATUS.IN_SHOP), value: inShopCount, color: STATUS_COLORS[VEHICLE_STATUS.IN_SHOP] },
    { name: statusLabel(VEHICLE_STATUS.RETIRED), value: retiredCount, color: STATUS_COLORS[VEHICLE_STATUS.RETIRED] },
  ].filter((item) => item.value > 0);

  // Weekly Operations chart: no server endpoint for this, so it's computed
  // from real trip data (created_at) rather than hardcoded placeholder
  // numbers. The Trip model only has created_at, not per-transition
  // timestamps, so both series bucket on that single date.
  const weeklyTrend = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days.map((d) => {
      const key = d.toISOString().split("T")[0];
      const dayTrips = trips.filter((t) => (t.created_at || "").slice(0, 10) === key);
      const fuel = dayTrips.reduce((acc, t) => acc + (Number(t.fuel_consumed) || 0), 0);
      return {
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        trips: dayTrips.length,
        fuel,
      };
    });
  }, [trips]);

  const userEmail = localStorage.getItem("user_email") || "Admin";
  const userName = userEmail.split("@")[0];

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-8 animate-fade-in">
      {/* 1. Simplified, Friendly Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Live Operations
            </span>
            <span className="text-xs font-semibold text-slate-300">
              Today is {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, <span className="bg-gradient-to-r from-brand-300 to-indigo-200 bg-clip-text text-transparent capitalize">{userName}</span>! Here's your fleet summary.
          </h1>
          <p className="text-sm text-slate-300">
            Quickly track vehicle availability, monitor on-road shipments, and check workshop maintenance at a glance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/trips"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-glow hover:bg-brand-700 transition-all active:scale-[0.97]"
          >
            <span>+</span> New Trip
          </Link>
          <Link
            to="/maintenance"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all"
          >
            Log Maintenance
          </Link>
        </div>
      </div>

      {/* Filter bar - scopes both the /dashboard/ summary and the donut */}
      <div className="flex flex-wrap gap-3">
        <Select className="w-40" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select className="w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        <Select className="w-40" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
          <option value="">All Regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        {(typeFilter || statusFilter || regionFilter) && (
          <button
            type="button"
            onClick={() => {
              setTypeFilter("");
              setStatusFilter("");
              setRegionFilter("");
            }}
            className="text-xs font-semibold text-brand-600 underline transition-colors hover:text-brand-800"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* 2. KPI cards - sourced from the real /dashboard/ endpoint, covering
          all 7 contract metrics (Active/Available Vehicles, In Maintenance,
          Active/Pending Trips, Drivers On Duty, Fleet Utilization %) across
          4 cards via subtext, instead of 7 separate tiles. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Available Vehicles */}
        <Link
          to="/vehicles"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ready for Dispatch
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <IconTruck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.available_vehicles}</span>
            <span className="text-sm font-semibold text-slate-500">/ {summary.active_vehicles} active</span>
          </div>
          <p className="mt-2 text-xs font-medium text-emerald-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Available in yards</span>
            <span className="font-bold">→</span>
          </p>
        </Link>

        {/* Card 2: Active On-Road Trips */}
        <Link
          to="/trips"
          className="group rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 via-white to-white p-5 shadow-card transition-all hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              On-Road Shipments
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
              <IconRoute className="h-5 w-5 animate-pulse" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.active_trips}</span>
            <span className="text-sm font-semibold text-blue-600">dispatched trips</span>
          </div>
          <p className="mt-2 text-xs font-medium text-blue-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>{summary.pending_trips} pending dispatch</span>
            <span className="font-bold">→</span>
          </p>
        </Link>

        {/* Card 3: Vehicles in Workshop / Maintenance */}
        <Link
          to="/maintenance"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Workshop / Shop
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
              <IconWrench className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.vehicles_in_maintenance}</span>
            <span className="text-sm font-semibold text-slate-500">vehicles</span>
          </div>
          <p className="mt-2 text-xs font-medium text-amber-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Open repair logs</span>
            <span className="font-bold">→</span>
          </p>
        </Link>

        {/* Card 4: Fleet Utilization % */}
        <Link
          to="/drivers"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fleet Utilization
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <IconUser className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.fleet_utilization_pct}</span>
            <span className="text-sm font-semibold text-slate-500">%</span>
          </div>
          <p className="mt-2 text-xs font-medium text-purple-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>{summary.drivers_on_duty} drivers on duty</span>
            <span className="font-bold">→</span>
          </p>
        </Link>
      </div>

      {/* 3. Clean Visual Charts Row (Uncluttered Analytics) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Operations Chart */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Weekly Operations Overview
              </h3>
              <p className="text-xs text-slate-500">
                Trips logged vs. fuel consumed, last 7 days
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-brand-600">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Trips Logged
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Fuel (Liters)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tripsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="trips" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#tripsGrad)" name="Trips" />
                <Area type="monotone" dataKey="fuel" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#fuelGrad)" name="Fuel (L)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clean Fleet Status Donut */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Fleet Status</h3>
            <p className="text-xs text-slate-500">Current allocation of {totalVehicles} vehicles</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold">
            {pieData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-100"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Streamlined Recent Activity & Active Dispatches List */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              Recent Active & Completed Trips
            </h3>
            <p className="text-xs text-slate-500">The latest transport dispatches and arrival logs</p>
          </div>
          <Link
            to="/trips"
            className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors"
          >
            View All Trips →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            No trips logged yet. Click "+ New Trip" above to start your first dispatch!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {trips.slice(0, 4).map((trip) => (
              <div
                key={trip.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 transition-colors hover:bg-slate-50/80 rounded-xl px-2"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-brand-600 font-mono text-xs font-bold">
                    #{trip.id}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <span>{trip.source}</span>
                      <span className="text-slate-400 font-normal">→</span>
                      <span>{trip.destination}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                      <span>Veh: <strong className="text-slate-700">{trip.vehicle_registration_number || trip.vehicle_display}</strong></span>
                      <span>Drvr: <strong className="text-slate-700">{trip.driver_name || trip.driver_display}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 self-end sm:self-auto w-full sm:w-auto">
                  <span className="text-xs font-medium text-slate-500">
                    {trip.cargo_weight} kg · {trip.planned_distance} km
                  </span>
                  <Badge variant={TRIP_STATUS_VARIANTS[trip.status] || "gray"} className="px-2.5 py-1 text-xs font-bold shrink-0">
                    {statusLabel(trip.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
