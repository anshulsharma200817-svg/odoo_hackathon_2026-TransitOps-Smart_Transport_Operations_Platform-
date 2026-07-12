import { Logo } from "./icons";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="relative hidden w-[42%] max-w-xl shrink-0 overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between">
        {/* road-dash motif: on-theme for a transport app instead of generic dots */}
        <div
          className="pointer-events-none absolute inset-0 animate-drift opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, white 0px, white 3px, transparent 3px, transparent 46px)",
          }}
        />
        <div className="pointer-events-none absolute -left-16 top-16 h-72 w-72 animate-blob rounded-full bg-brand-600/40 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-0 h-80 w-80 animate-blob rounded-full bg-amber-400/20 blur-3xl [animation-delay:2s]" />

        <div className="relative z-10 flex items-center gap-2.5 px-12 pt-12">
          <Logo />
          <span className="text-lg font-semibold tracking-tight text-white">TransitOps</span>
        </div>

        <div className="relative z-10 px-12 pb-16">
          <div className="mb-4 h-1 w-10 rounded-full bg-gradient-to-r from-amber-400 to-brand-400" />
          <p className="max-w-sm text-3xl font-semibold leading-tight tracking-tight text-white">
            Keep every vehicle, driver, and trip in one view.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Dispatch faster, catch maintenance before it becomes downtime, and
            see fleet cost per vehicle at a glance.
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12 sm:px-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-multiply"
          style={{ backgroundImage: GRAIN }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />

        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">TransitOps</span>
        </div>

        <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
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
