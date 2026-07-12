import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { IconUser, IconFuel } from "../components/icons";

export default function DriverDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      try {
        const { data } = await client.get("/drivers/me/");
        if (mounted) setProfile(data);
      } catch (err) {
        console.error("Failed to fetch driver profile", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProfile();
    return () => { mounted = false; };
  }, []);

  const userName = localStorage.getItem("user_email")?.split("@")[0] || "Driver";

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
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
            Welcome back, <span className="bg-gradient-to-r from-brand-300 to-indigo-200 bg-clip-text text-transparent capitalize">{userName}</span>!
          </h1>
          <p className="text-sm text-slate-300">
            Check your profile and quickly log your trip expenses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 text-brand-600">
              <div className="p-2 bg-brand-50 rounded-lg">
                <IconUser className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
            </div>
            {profile ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-slate-900">{profile.status}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Safety Score</span>
                  <span className="font-bold text-emerald-600">{profile.safety_score} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">License</span>
                  <span className="font-bold text-slate-900">{profile.license_number}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Profile data unavailable.</p>
            )}
          </div>
          <Link
            to="/profile"
            className="mt-6 block text-center rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-slate-100 transition-colors"
          >
            View Full Profile →
          </Link>
        </div>

        {/* Expenses Action Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg">
                <IconFuel className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Log Expenses</h2>
            </div>
            <p className="text-sm text-slate-600">
              Did you refuel or pay a toll? Keep your logs up to date by adding your latest expenses.
            </p>
          </div>
          <Link
            to="/fuel-expenses"
            className="mt-6 block text-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Add Fuel & Expenses +
          </Link>
        </div>
      </div>
    </div>
  );
}
