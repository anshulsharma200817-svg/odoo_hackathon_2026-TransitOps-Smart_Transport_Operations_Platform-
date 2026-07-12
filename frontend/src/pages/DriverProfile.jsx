import { useEffect, useState } from "react";
import client from "../api/client";
import { IconUser } from "../components/icons";

export default function DriverProfile() {
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

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-6">
        <div className="h-20 w-1/3 bg-slate-200 rounded-lg"></div>
        <div className="h-64 bg-slate-200 rounded-3xl"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Driver profile not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-8 animate-fade-in">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <IconUser className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500">View your driving record and credentials.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm max-w-2xl">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
          <p className="text-sm text-slate-500">TransitOps Driver</p>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</dt>
              <dd className="text-sm font-medium text-slate-900">{profile.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Safety Score</dt>
              <dd className="text-sm font-medium text-emerald-600">{profile.safety_score} / 100</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">License Number</dt>
              <dd className="text-sm font-medium text-slate-900">{profile.license_number}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">License Category</dt>
              <dd className="text-sm font-medium text-slate-900">{profile.license_category}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">License Expiry</dt>
              <dd className="text-sm font-medium text-slate-900">{profile.license_expiry_date}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Number</dt>
              <dd className="text-sm font-medium text-slate-900">{profile.contact_number || "Not provided"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
