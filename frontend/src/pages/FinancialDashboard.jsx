import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getReports } from "../api/reports";
import { IconChart, IconFuel } from "../components/icons";

export default function FinancialDashboard() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const data = await getReports();
        if (mounted) {
          setReport(data || []);
        }
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => {
    const totalCost = report.reduce((acc, r) => acc + (Number(r.operational_cost) || 0), 0);
    const avgRoi = report.length
      ? report.reduce((acc, r) => acc + (Number(r.roi) || 0), 0) / report.length
      : 0;
    return { totalCost, avgRoi };
  }, [report]);

  const userName = localStorage.getItem("user_email")?.split("@")[0] || "Financial Analyst";

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
            Welcome, <span className="bg-gradient-to-r from-purple-300 to-pink-200 bg-clip-text text-transparent capitalize">{userName}</span>!
          </h1>
          <p className="text-sm text-slate-300">
            Track fleet operational costs, revenue, and return on investment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI: Total Operational Cost */}
        <Link
          to="/reports"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Operational Cost
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
              <IconChart className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">₹{totals.totalCost.toLocaleString()}</span>
          </div>
          <p className="mt-2 text-xs font-medium text-purple-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Review full reports</span>
            <span className="font-bold">→</span>
          </p>
        </Link>

        {/* KPI: Avg ROI */}
        <Link
          to="/reports"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Fleet ROI
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
              <IconChart className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{(totals.avgRoi * 100).toFixed(2)}%</span>
          </div>
          <p className="mt-2 text-xs font-medium text-blue-600 flex items-center justify-between border-t border-slate-100 pt-3">
            <span>Across {report.length} vehicles</span>
            <span className="font-bold">→</span>
          </p>
        </Link>
        
        {/* Quick Action: Log Expenses */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg">
                <IconFuel className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Fuel & Expenses</h2>
            </div>
            <p className="text-sm text-slate-600">
              Monitor incoming fuel logs and register miscellaneous toll expenses.
            </p>
          </div>
          <Link
            to="/fuel-expenses"
            className="mt-6 block text-center rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-slate-100 transition-colors"
          >
            Manage Expenses →
          </Link>
        </div>
      </div>
      
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 max-w-3xl">
        Note: ROI calculations use a placeholder revenue of ₹3.00 per km for completed trips. You may see negative ROI values until the actual revenue tracking system is fully integrated.
      </div>
    </div>
  );
}
