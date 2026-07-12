import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="flex gap-4 p-4 bg-slate-900 text-white">
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/vehicles">Vehicles</Link>
      <Link to="/drivers">Drivers</Link>
      <Link to="/trips">Trips</Link>
      <Link to="/maintenance">Maintenance</Link>
      <Link to="/fuel-expenses">Fuel & Expenses</Link>
      <Link to="/reports">Reports</Link>
    </nav>
  );
}
