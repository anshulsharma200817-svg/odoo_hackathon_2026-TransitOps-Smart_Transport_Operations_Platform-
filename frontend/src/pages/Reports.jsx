import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useToast } from "../components/ui/ToastProvider";
import { getReports, downloadReportsCsv } from "../api/reports";
import { IconChart, IconTruck } from "../components/icons";

export default function Reports() {
  const showToast = useToast();
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getReports();
        if (mounted) setReport(data || []);
      } catch (err) {
        showToast(err.message || "Could not load reports", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      report.filter(
        (r) =>
          !searchQuery ||
          r.vehicle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.vehicle_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [report, searchQuery],
  );

  const totals = useMemo(() => {
    const avgEfficiency = report.length
      ? report.reduce((acc, r) => acc + (Number(r.fuel_efficiency) || 0), 0) / report.length
      : 0;
    const totalCost = report.reduce((acc, r) => acc + (Number(r.operational_cost) || 0), 0);
    return { avgEfficiency, totalCost };
  }, [report]);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadReportsCsv();
      showToast("Report exported as CSV");
    } catch (err) {
      showToast(err.message || "Could not export CSV", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-glow">
              <IconChart className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Reports
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Fuel efficiency, operational cost, and ROI per vehicle.
          </p>
        </div>
        <Button
          onClick={handleExport}
          loading={exporting}
          className="flex items-center justify-center gap-2"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Vehicles Reported
          </span>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{report.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Avg Fuel Efficiency
          </span>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">
            {totals.avgEfficiency.toFixed(2)} <span className="text-sm font-semibold text-slate-500">km/L</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Operational Cost
          </span>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">
            ₹{totals.totalCost.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
        Note: ROI assumes placeholder revenue (₹3.00 per km of completed trip distance) since
        real revenue tracking isn&apos;t wired up yet — expect low or negative values across the
        board until that lands. See the dev plan&apos;s open blocker for details.
      </div>

      <div className="max-w-xs">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vehicle..."
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading reports…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500">
          No vehicles match this search.
        </div>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Vehicle</th>
                  <th className="px-4 py-3">Fuel Efficiency</th>
                  <th className="px-4 py-3">Operational Cost</th>
                  <th className="px-4 py-3">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.vehicle} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.vehicle}</div>
                      <div className="text-xs text-slate-500">{r.vehicle_name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.fuel_efficiency} km/L</td>
                    <td className="px-4 py-3 text-slate-600">
                      ₹{Number(r.operational_cost).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${r.roi < 0 ? "text-red-600" : "text-emerald-600"}`}
                      >
                        {(r.roi * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((r) => (
              <div
                key={r.vehicle}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <div className="mb-2 flex items-center gap-2">
                  <IconTruck className="h-4 w-4 text-brand-600" />
                  <div>
                    <p className="font-medium text-slate-900">{r.vehicle}</p>
                    <p className="text-xs text-slate-500">{r.vehicle_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span>{r.fuel_efficiency} km/L</span>
                  <span>₹{Number(r.operational_cost).toLocaleString()}</span>
                  <span className={`font-medium ${r.roi < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    ROI: {(r.roi * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
