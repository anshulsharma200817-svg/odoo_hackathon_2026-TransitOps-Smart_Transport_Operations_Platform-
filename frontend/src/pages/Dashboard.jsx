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
import { listVehicles } from "../api/vehicles";
import { listDrivers } from "../api/drivers";
import { listTrips } from "../api/trips";
import Badge from "../components/ui/Badge";
import { TRIP_STATUS_VARIANTS } from "../lib/statusVariants";
import { IconRoute, IconTruck, IconUser, IconWrench } from "../components/icons";

const STATUS_COLORS = {
  Available: "#10b981", // emerald
  "On Trip": "#3b82f6", // blue
  "In Shop": "#f59e0b", // amber
  Retired: "#64748b", // slate
};

const WEEKLY_TREND = [
  { day: "Mon", trips: 12, fuel: 340 },
  { day: "Tue", trips: 16, fuel: 410 },
  { day: "Wed", trips: 14, fuel: 390 },
  { day: "Thu", trips: 19, fuel: 520 },
  { day: "Fri", trips: 22, fuel: 610 },
  { day: "Sat", trips: 15, fuel: 430 },
  { day: "Sun", trips: 9, fuel: 240 },
];

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [vList, dList, tList] = await Promise.all([
          listVehicles().catch(() => []),
          listDrivers().catch(() => []),
          listTrips().catch(() => []),
        ]);
        if (mounted) {
          setVehicles(vList || []);
          setDrivers(dList || []);
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

  // Fleet Counts
  const totalVehicles = vehicles.length;
  const availableCount = vehicles.filter(
    (v) => v.status === "Available" || v.status === "AVAILABLE"
  ).length;
  const onTripCount = vehicles.filter(
    (v) => v.status === "On Trip" || v.status === "ON_TRIP"
  ).length;
  const inShopCount = vehicles.filter(
    (v) => v.status === "In Shop" || v.status === "IN_SHOP"
  ).length;
  const retiredCount = vehicles.filter(
    (v) => v.status === "Retired" || v.status === "RETIRED"
  ).length;

  const activeTripsCount = trips.filter(
    (t) => t.status === "Dispatched" || t.status === "DISPATCHED"
  ).length;

  const avgSafetyScore = drivers.length
    ? Math.round(
        drivers.reduce((acc, d) => acc + (Number(d.safety_score) || 0), 0) / drivers.length
      )
    : 0;

  // Donut chart data
  const pieData = [
    { name: "Available", value: availableCount, color: STATUS_COLORS.Available },
    { name: "On Trip", value: onTripCount, color: STATUS_COLORS["On Trip"] },
    { name: "In Shop", value: inShopCount, color: STATUS_COLORS["In Shop"] },
    { name: "Retired", value: retiredCount, color: STATUS_COLORS.Retired },
  ].filter((item) => item.value > 0);

  const userEmail = localStorage.getItem("user_email") || "Admin";
  const userName = userEmail.split("@")[0];

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-8 animate-fade-in">
      {/* 1. Simplified, Friendly Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
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

      {/* 2. Easy-to-Understand Summary Cards (Clean & Uncluttered) */}
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
            <span className="text-3xl font-extrabold text-slate-900">{availableCount}</span>
            <span className="text-sm font-semibold text-slate-500">/ {totalVehicles} vehicles</span>
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
            <span className="text-3xl font-extrabold text-slate-900">{activeTripsCount}</span>
            <span className="text-sm font-semibold text-blue-600">dispatched trips</span>
          </div>
          <p className="mt-2 text-xs font-medium text-blue-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Currently in transit</span>
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
            <span className="text-3xl font-extrabold text-slate-900">{inShopCount}</span>
            <span className="text-sm font-semibold text-slate-500">vehicles</span>
          </div>
          <p className="mt-2 text-xs font-medium text-amber-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Open repair logs</span>
            <span className="font-bold">→</span>
          </p>
        </Link>

        {/* Card 4: Driver Safety Index */}
        <Link
          to="/drivers"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fleet Safety Rating
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <IconUser className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{avgSafetyScore}</span>
            <span className="text-sm font-semibold text-slate-500">/ 100</span>
          </div>
          <p className="mt-2 text-xs font-medium text-purple-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>{drivers.length} drivers on roster</span>
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
                Number of trips dispatched vs. fuel consumed each day
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-brand-600">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Trips Dispatched
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Fuel (Liters / 10)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY_TREND} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    {trip.status}
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
