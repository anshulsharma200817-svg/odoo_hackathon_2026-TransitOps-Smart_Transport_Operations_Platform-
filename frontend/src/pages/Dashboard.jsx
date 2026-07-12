import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { TRIP_STATUS_VARIANTS, VEHICLE_STATUS_VARIANTS } from "../lib/statusVariants";
import { IconDashboard, IconRoute, IconTruck, IconUser, IconWrench, IconFuel } from "../components/icons";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const WEEKLY_DATA = [
  { day: "Mon", trips: 12, fuel: 340, distance: 1850 },
  { day: "Tue", trips: 16, fuel: 410, distance: 2200 },
  { day: "Wed", trips: 14, fuel: 390, distance: 2050 },
  { day: "Thu", trips: 19, fuel: 520, distance: 2800 },
  { day: "Fri", trips: 22, fuel: 610, distance: 3400 },
  { day: "Sat", trips: 15, fuel: 430, distance: 2300 },
  { day: "Sun", trips: 9, fuel: 240, distance: 1350 },
];

export default function Dashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadAll() {
      try {
        const [vData, dData, tData] = await Promise.all([
          listVehicles().catch(() => []),
          listDrivers().catch(() => []),
          listTrips().catch(() => []),
        ]);
        if (mounted) {
          setVehicles(vData || []);
          setDrivers(dData || []);
          setTrips(tData || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute fleet status chart
  const vehicleStatusCounts = useMemo(() => {
    const counts = { Available: 0, "On Trip": 0, "In Shop": 0, Retired: 0 };
    vehicles.forEach((v) => {
      if (counts[v.status] !== undefined) counts[v.status]++;
      else counts[v.status] = (counts[v.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [vehicles]);

  const totalFleetValue = useMemo(
    () => vehicles.reduce((acc, v) => acc + (Number(v.acquisition_cost) || 0), 0),
    [vehicles]
  );

  const activeTripsCount = trips.filter((t) => t.status === "Dispatched").length;
  const completedTripsCount = trips.filter((t) => t.status === "Completed").length;
  const avgSafetyScore = drivers.length
    ? Math.round(drivers.reduce((acc, d) => acc + (Number(d.safety_score) || 0), 0) / drivers.length)
    : 0;

  const role = localStorage.getItem("role") || "Transport Admin";
  const userEmail = localStorage.getItem("user_email") || "admin@transitops.dev";

  return (
    <div className="min-h-full space-y-8 p-4 sm:p-8 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl animate-pulse-subtle" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 border border-brand-400/40 px-3 py-1 text-xs font-bold text-brand-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Live Telemetry Feed
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300 backdrop-blur-md">
                Role: <strong className="text-white uppercase">{role}</strong>
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back to TransitOps, <span className="bg-gradient-to-r from-brand-300 to-indigo-200 bg-clip-text text-transparent">{userEmail.split("@")[0]}</span>!
            </h1>
            <p className="max-w-xl text-sm font-medium text-slate-300">
              Your smart transport dashboard is tracking <strong className="text-white">{vehicles.length} vehicles</strong> across regional yards and coordinating <strong className="text-white">{activeTripsCount} active dispatches</strong> today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/trips"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-glow hover:scale-105 hover:shadow-glow-lg transition-all duration-300"
            >
              <span>+</span> Dispatch Trip
            </Link>
            <Link
              to="/vehicles"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all duration-300"
            >
              Manage Fleet
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/vehicles"
          className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fleet Availability</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              <IconTruck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {vehicles.filter((v) => v.status === "Available").length}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ {vehicles.length} total vehicles</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-indigo-600 font-semibold">
            <span>View all assets →</span>
            <span>{vehicles.length ? Math.round((vehicles.filter((v) => v.status === "Available").length / vehicles.length) * 100) : 0}% free</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full"
              style={{ width: `${vehicles.length ? (vehicles.filter((v) => v.status === "Available").length / vehicles.length) * 100 : 0}%` }}
            />
          </div>
        </Link>

        <Link
          to="/trips"
          className="group relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/50 via-white to-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Active Dispatches</span>
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <IconRoute className="h-5 w-5 animate-pulse" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{activeTripsCount}</span>
            <span className="text-xs font-semibold text-blue-600">Live shipments on road</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-blue-700 font-semibold">
            <span>Track GPS coordinates →</span>
            <span>{completedTripsCount} completed today</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full bg-blue-600 rounded-full animate-shimmer"
              style={{ width: `${trips.length ? (activeTripsCount / trips.length) * 100 : 50}%` }}
            />
          </div>
        </Link>

        <Link
          to="/drivers"
          className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Driver Telemetry Index</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <IconUser className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{avgSafetyScore}</span>
            <span className="text-xs font-semibold text-slate-500">/ 100 PTS</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-purple-600 font-semibold">
            <span>Roster & Licenses →</span>
            <span className="text-emerald-600 font-bold">{drivers.length} drivers onboarded</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
              style={{ width: `${avgSafetyScore}%` }}
            />
          </div>
        </Link>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Fleet CAPEX</span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-brand-300 backdrop-blur-md">
              Value
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-white">
              ₹{(totalFleetValue / 100000).toFixed(1)}L
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-300 font-medium flex items-center justify-between">
            <span>Total asset valuation</span>
            <span className="text-brand-400">Audited ✓</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gradient-to-r from-brand-400 to-emerald-400 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Trend Chart */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
                Weekly Trip Dispatches & Fuel Telemetry
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparative analysis of daily transport dispatches (count) vs fuel consumption (liters)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-brand-600">
                <span className="h-3 w-3 rounded-sm bg-brand-500" /> Trips Dispatched
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Fuel (L / 10)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                  }}
                />
                <Area type="monotone" dataKey="trips" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTrips)" name="Trips Dispatched" />
                <Area type="monotone" dataKey="fuel" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFuel)" name="Fuel Consumed (L)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Status Donut Chart */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Fleet Allocation Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time asset distribution across operational states</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleStatusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vehicleStatusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs font-semibold">
            {vehicleStatusCounts.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trips & Live Activity Feed */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              Live Transport Trips & Recent Activity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Most recently created itineraries and dispatch logs</p>
          </div>
          <Link
            to="/trips"
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-brand-600 transition-all hover:bg-brand-600 hover:text-white"
          >
            View All Trips →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No active trips recorded yet. Click "Dispatch Trip" above to launch your first itinerary!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.slice(0, 6).map((trip, idx) => (
              <div
                key={trip.id}
                style={{ animationDelay: `${idx * 50}ms` }}
                className="group animate-fade-in-up flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:-translate-y-1 hover:border-brand-300 hover:bg-white hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">TRIP #{trip.id}</span>
                    <Badge variant={TRIP_STATUS_VARIANTS[trip.status] || "gray"} className="px-2 py-0.5 text-[11px] font-bold">
                      {trip.status}
                    </Badge>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <span className="text-brand-600">{trip.source}</span>
                    <span className="text-slate-400">→</span>
                    <span>{trip.destination}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 font-medium grid grid-cols-2 gap-1 border-t border-slate-200/60 pt-2">
                    <span>Veh: <strong className="text-slate-800">{trip.vehicle_registration_number || trip.vehicle_display}</strong></span>
                    <span>Drvr: <strong className="text-slate-800">{trip.driver_name || trip.driver_display}</strong></span>
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-200/60 pt-2 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span>Payload: {trip.cargo_weight} kg</span>
                  <span>Dist: {trip.planned_distance} km</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
