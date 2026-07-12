import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { listVehicles, VEHICLE_STATUSES } from "../api/vehicles";
import { listDrivers } from "../api/drivers";
import { IconWrench, IconUser, IconTruck } from "../components/icons";
import { VEHICLE_STATUS } from "../lib/enumLabels";

export default function SafetyDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [vList, dList] = await Promise.all([
          listVehicles().catch(() => []),
          listDrivers().catch(() => []),
        ]);
        if (mounted) {
          setVehicles(vList || []);
          setDrivers(dList || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const inShopCount = vehicles.filter((v) => v.status === VEHICLE_STATUS.IN_SHOP).length;
  
  const avgSafetyScore = useMemo(() => {
    if (!drivers.length) return 0;
    const total = drivers.reduce((sum, d) => sum + (Number(d.safety_score) || 0), 0);
    return (total / drivers.length).toFixed(1);
  }, [drivers]);

  const userName = localStorage.getItem("user_email")?.split("@")[0] || "Safety Officer";

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-6">
        <div className="h-32 rounded-3xl bg-slate-200 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 rounded-2xl bg-slate-200" />
          <div className="h-40 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent capitalize">{userName}</span>!
          </h1>
          <p className="text-sm text-slate-300">
            Monitor fleet safety and oversee vehicle maintenance logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI: Safety Score */}
        <Link
          to="/drivers"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Avg Safety Score
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <IconUser className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{avgSafetyScore}</span>
            <span className="text-sm font-semibold text-slate-500">/ 100</span>
          </div>
          <p className="mt-2 text-xs font-medium text-emerald-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Across {drivers.length} drivers</span>
            <span className="font-bold">→</span>
          </p>
        </Link>

        {/* KPI: Vehicles in Workshop */}
        <Link
          to="/maintenance"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              In Workshop
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
            <span>Review maintenance logs</span>
            <span className="font-bold">→</span>
          </p>
        </Link>
        
        {/* Quick Action: View Vehicles */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 text-brand-600">
              <div className="p-2 bg-brand-50 rounded-lg">
                <IconTruck className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Fleet Status</h2>
            </div>
            <p className="text-sm text-slate-600">
              Check on the availability and conditions of the current fleet.
            </p>
          </div>
          <Link
            to="/vehicles"
            className="mt-6 block text-center rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-slate-100 transition-colors"
          >
            View All Vehicles →
          </Link>
        </div>
      </div>
    </div>
  );
}
