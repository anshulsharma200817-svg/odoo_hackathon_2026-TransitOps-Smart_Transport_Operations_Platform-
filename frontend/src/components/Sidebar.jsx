import { NavLink } from "react-router-dom";

// roles: null = visible to everyone; later hours can filter this list by the
// logged-in user's role before rendering.
const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", roles: null },
  { label: "Vehicles", path: "/vehicles", roles: null },
  { label: "Drivers", path: "/drivers", roles: null },
  { label: "Trips", path: "/trips", roles: null },
  { label: "Maintenance", path: "/maintenance", roles: null },
  { label: "Fuel & Expenses", path: "/fuel-expenses", roles: null },
  { label: "Reports", path: "/reports", roles: null },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="p-4 text-lg font-semibold border-b border-slate-800">
        TransitOps
      </div>
      <nav className="flex-1 flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
