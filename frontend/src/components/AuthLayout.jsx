import { Logo } from "./icons";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-[42%] max-w-xl shrink-0 overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="pointer-events-none absolute -left-16 top-16 h-72 w-72 animate-blob rounded-full bg-brand-600/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-0 h-80 w-80 animate-blob rounded-full bg-indigo-400/30 blur-3xl [animation-delay:2s]" />

        <div className="relative z-10 flex items-center gap-2.5 px-12 pt-12">
          <Logo />
          <span className="text-lg font-semibold tracking-tight text-white">TransitOps</span>
        </div>

        <div className="relative z-10 px-12 pb-16">
          <p className="max-w-sm text-3xl font-semibold leading-tight tracking-tight text-white">
            Keep every vehicle, driver, and trip in one view.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Dispatch faster, catch maintenance before it becomes downtime, and
            see fleet cost per vehicle at a glance.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">TransitOps</span>
        </div>

        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
