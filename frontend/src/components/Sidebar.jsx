import { NavLink, useNavigate } from "react-router-dom";
import { clearSession, getRole } from "../api/auth";
import { statusLabel } from "../lib/enumLabels";
import {
  Logo,
  IconDashboard,
  IconTruck,
  IconUser,
  IconRoute,
  IconWrench,
  IconFuel,
  IconChart,
  IconClose,
  IconLogout,
} from "./icons";

// roles: null = visible to everyone; later hours can filter this list by the
// logged-in user's role before rendering.
const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", roles: null, Icon: IconDashboard },
  { label: "Vehicles", path: "/vehicles", roles: null, Icon: IconTruck },
  { label: "Drivers", path: "/drivers", roles: null, Icon: IconUser },
  { label: "Trips", path: "/trips", roles: null, Icon: IconRoute },
  { label: "Maintenance", path: "/maintenance", roles: null, Icon: IconWrench },
  { label: "Fuel & Expenses", path: "/fuel-expenses", roles: null, Icon: IconFuel },
  { label: "Reports", path: "/reports", roles: null, Icon: IconChart },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate();
  const role = getRole();

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] transition-opacity md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-slate-950 text-white transition-transform duration-300 ease-out md:static md:z-auto md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <span className="text-base font-semibold tracking-tight">TransitOps</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
          >
            <IconClose />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute -left-3 h-5 w-0.5 rounded-full bg-brand-400 transition-transform duration-200 ${
                      isActive ? "scale-y-100" : "scale-y-0"
                    }`}
                  />
                  <item.Icon
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"
                    }`}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 py-4">
          {role && (
            <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              {statusLabel(role)}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <IconLogout />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
