import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Check, Layers3, ShieldCheck, Sparkles } from 'lucide-react';

interface AuthFrameProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  sideTitle?: string;
  sideCopy?: string;
  sideItems?: string[];
}

export function AuthFrame({
  eyebrow,
  title,
  subtitle,
  children,
  sideTitle = 'Secure access for the operating system',
  sideCopy = 'A premium gateway for teams running inventory, purchasing, sales, finance, payroll and governance from one workspace.',
  sideItems = ['Tenant-aware security', 'Role-based permissions', 'Audit-ready sessions'],
}: AuthFrameProps) {
  return (
    <div className="min-h-screen bg-[#eef4f6] text-slate-950 dark:bg-[#061013] dark:text-white">
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef7f6_0%,#f8fbff_45%,#e9f2ef_100%)] dark:bg-[linear-gradient(135deg,#061013_0%,#091923_46%,#07140f_100%)]" />
        <div className="absolute left-[-12rem] top-[-14rem] h-[34rem] w-[34rem] rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-400/10" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-400/10" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.045)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)]" />

        <header className="relative z-10 mx-auto flex h-20 max-w-7xl 2xl:max-w-[2200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white shadow-lg shadow-cyan-900/10 dark:bg-white dark:text-slate-950">
              <Layers3 className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.2em]">STOCKMANAGER</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">Access Console</span>
            </span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:text-slate-950 dark:border-white/10 dark:bg-white/8 dark:text-slate-300 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </header>

        <main className="relative z-10 mx-auto grid max-w-7xl 2xl:max-w-[2200px] gap-8 px-4 pb-12 pt-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-16 lg:pt-10">
          <section className="hidden min-h-[680px] flex-col justify-between overflow-hidden rounded-lg bg-slate-950 p-8 text-white shadow-2xl shadow-slate-900/20 dark:bg-white dark:text-slate-950 lg:flex">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-cyan-200 dark:border-slate-200 dark:bg-slate-50 dark:text-cyan-800">
                <Sparkles className="h-4 w-4" />
                Mission-control entry
              </div>
              <h2 className="mt-7 max-w-lg text-5xl font-semibold leading-[1.02] tracking-tight">{sideTitle}</h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-slate-300 dark:text-slate-600">{sideCopy}</p>
            </div>

            <div className="relative mt-10">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-300/25 via-emerald-300/20 to-amber-200/20 blur-2xl" />
              <div className="relative rounded-lg border border-white/10 bg-white/8 p-5 dark:border-slate-200 dark:bg-slate-50">
                <div className="grid grid-cols-3 gap-3">
                  {['Inventory', 'Finance', 'Payroll'].map((item, index) => (
                    <div key={item} className="rounded-lg bg-white p-3 text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white">
                      <div className="mb-6 h-1.5 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${68 + index * 12}%` }} />
                      <p className="text-xs font-semibold">{item}</p>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Online</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3">
                  {sideItems.map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-lg bg-white/8 p-3 dark:bg-white">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-300 text-slate-950">
                        <Check className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-[680px] items-center">
            <div className="w-full">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure workspace
              </div>

              <div className="relative overflow-hidden rounded-lg border border-white/80 bg-white/88 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:p-8 lg:p-10">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-200" />
                <div className="mb-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">{eyebrow}</p>
                  <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl">{title}</h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
                </div>
                {children}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
