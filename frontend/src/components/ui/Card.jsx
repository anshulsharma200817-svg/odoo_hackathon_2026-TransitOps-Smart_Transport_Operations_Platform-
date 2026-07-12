export default function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-8 shadow-card ${className}`}>
      {children}
    </div>
  );
}
