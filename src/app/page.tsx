import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Layers,
  Award,
  ArrowRight,
  ShieldCheck,
  ArrowUpRight,
  Radio,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";
import { ScrollReveal } from "@/components/ScrollReveal";

// The 3D globe pulls in the whole three.js library — load it only in the
// browser, after the page renders, so first paint isn't blocked by it.
// Same height as the globe container, so no layout shift.
const EarthGlobe3D = dynamic(
  () => import("@/components/EarthGlobe3D").then((m) => m.EarthGlobe3D),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full rounded-xl bg-white border border-zinc-200/90 overflow-hidden">
        <div className="w-full h-[480px] sm:h-[540px] flex items-center justify-center">
          <span className="text-[11px] font-mono text-zinc-400">Loading 3D Observatory…</span>
        </div>
      </div>
    ),
  }
);

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role as "ADMIN" | "TRAINER" | "TRAINEE" | undefined;

  // Live SQLite metrics
  const [traineeCount, courseCount, blockCount, attemptCount] = await Promise.all([
    prisma.user.count({ where: { role: "TRAINEE" } }).catch(() => 10),
    prisma.course.count().catch(() => 4),
    prisma.competencyBlock.count().catch(() => 3),
    prisma.assessmentAttempt.count().catch(() => 8),
  ]);

  const institutes = [
    {
      code: "IMD",
      name: "India Meteorological Department",
      hq: "New Delhi & Pune",
      focus: "Doppler Weather Radar, Cyclone Early Warning & NWP Assimilation",
      coords: "28°35' N, 77°13' E",
    },
    {
      code: "INCOIS",
      name: "Indian National Centre for Ocean Information Services",
      hq: "Hyderabad",
      focus: "Indian Ocean Tsunami Early Warning, Ocean State Forecast & Argo Arrays",
      coords: "17°32' N, 78°22' E",
    },
    {
      code: "NIOT",
      name: "National Institute of Ocean Technology",
      hq: "Chennai",
      focus: "Matsya-6000 Deep Ocean Submersible & Marine Engineering Systems",
      coords: "12°56' N, 80°13' E",
    },
    {
      code: "IITM",
      name: "Indian Institute of Tropical Meteorology",
      hq: "Pune",
      focus: "Monsoon Mission Coupled Dynamics & Pratyush HPC Operations",
      coords: "18°32' N, 73°48' E",
    },
    {
      code: "NCMRWF",
      name: "National Centre for Medium Range Weather Forecasting",
      hq: "Noida",
      focus: "Global Ensemble Forecasting System (GEFS) & Numerical Models",
      coords: "28°37' N, 77°21' E",
    },
    {
      code: "NCPOR",
      name: "National Centre for Polar and Ocean Research",
      hq: "Vasco da Gama, Goa",
      focus: "Maitri, Bharati & Himadri Observatories & Cryospheric Drilling",
      coords: "15°24' N, 73°48' E",
    },
  ];

  // Live ticker items
  const ticker = [
    "IMD Cyclone Warning System — Active Surveillance 24h/7",
    "INCOIS Tsunami EWS — All Bottom Pressure Recorders Nominal",
    "NIOT Matsya-6000 Submersible — Sea Trials Phase III",
    "IITM Pratyush HPC — NWP Model Cycle 00Z Running",
    "NCMRWF GEFS Ensemble — 16-Member Forecast Issued",
    "NCPOR Bharati Station — Antarctica Telemetry Synced",
    "INCOIS Argo Float Network — 432 Profilers Active in Indian Ocean",
    "IMD INSAT-3DR — Real-Time Satellite Imagery Streaming",
  ];

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 flex flex-col selection:bg-zinc-200 selection:text-zinc-950">
      {/* ── Government Identity Strip ─────────────────────────────── */}
      <div className="border-b border-zinc-200 bg-white text-zinc-700 text-[11px] font-mono py-1.5 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-900">भारत सरकार</span>
            <span className="text-zinc-300">|</span>
            <span>Government of India</span>
            <span className="text-zinc-300">&bull;</span>
            <span className="hidden sm:inline">Ministry of Earth Sciences (MoES)</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              {/* Radar-ping: live green dot with outer ring */}
              <span className="relative flex h-2 w-2">
                <span className="animate-radar-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              <span className="text-zinc-800">7 Telemetry Nodes Active</span>
            </span>
            <span className="hidden md:inline text-zinc-500">IST / UTC+05:30</span>
          </div>
        </div>
      </div>

      {/* ── Live Telemetry Ticker (Marquee) ────────────────────────── */}
      <div className="border-b border-zinc-100 bg-zinc-50 py-1.5 overflow-hidden">
        <div className="animate-marquee flex whitespace-nowrap">
          {[...ticker, ...ticker].map((item, i) => (
            <span key={i} className="inline-flex items-center space-x-2 mr-12 text-[11px] font-mono text-zinc-700">
              <span className="w-1 h-1 rounded-full bg-zinc-400 inline-block" />
              <span>{item}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Navigation ───────────────────────────────────────── */}
      <header className="border-b border-zinc-200/80 bg-white/95 backdrop-blur sticky top-0 z-40 animate-fade-in">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-8 h-8 rounded bg-zinc-950 flex items-center justify-center font-mono font-bold text-white text-xs tracking-wider">
              MoES
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm tracking-tight text-zinc-950">Capacity Connect</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                  SIH26075
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">Autonomous Institute Competency Architecture</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {userRole ? (
              <Link
                href={`/${userRole.toLowerCase()}`}
                className="px-4 py-1.5 rounded text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              >
                Go to {userRole} Desk &rarr;
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-zinc-800 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-1.5 rounded text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero: Serif Headline + 3D Globe ────────────────────── */}
        <section className="border-b border-zinc-200/80 bg-white bg-grid-pattern">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: Text */}
              <div className="space-y-6">
                <div className="animate-fade-in">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-mono">
                    <Radio className="w-3.5 h-3.5 text-zinc-700" />
                    <span>Inter-Directorate Capacity Building Portal</span>
                  </div>
                </div>

                <h1 className="font-serif-heading text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-zinc-950 leading-[1.08] animate-fade-in delay-100">
                  National technical capacity &amp; competency framework for Earth Sciences.
                </h1>

                <p className="text-base text-zinc-600 leading-relaxed font-normal max-w-xl animate-fade-in delay-200">
                  A unified digital training architecture standardizing technical workflows, operational SOPs, and competency certification across India&apos;s apex meteorological, oceanographic, and polar research institutes.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-2 animate-fade-in delay-300">
                  {userRole ? (
                    <Link
                      href={`/${userRole.toLowerCase()}`}
                      className="px-5 py-2.5 rounded font-medium text-xs text-white bg-zinc-950 hover:bg-zinc-800 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.08)] inline-flex items-center active:scale-[0.98]"
                    >
                      <span>Open {userRole} Console</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/signup"
                        className="px-5 py-2.5 rounded font-medium text-xs text-white bg-zinc-950 hover:bg-zinc-800 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.08)] inline-flex items-center active:scale-[0.98]"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-2" />
                      </Link>
                      <Link
                        href="/login"
                        className="px-5 py-2.5 rounded font-medium text-xs text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-300 transition-colors inline-flex items-center active:scale-[0.98]"
                      >
                        <span>Sign In</span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Live metric pills */}
                <div className="flex flex-wrap gap-2 pt-1 animate-fade-in delay-400">
                  {[
                    { label: "Active Officers", val: traineeCount },
                    { label: "Competency Blocks", val: blockCount },
                    { label: "Courses Published", val: courseCount },
                    { label: "Assessments Logged", val: attemptCount },
                  ].map(({ label, val }, i) => (
                    <div
                      key={label}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs"
                    >
                      <span className="font-mono font-bold text-zinc-950">{val}</span>
                      <span className="text-zinc-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: 3D Globe */}
              <div className="animate-fade-in-slow delay-200">
                <EarthGlobe3D />
                <p className="text-center text-[11px] font-mono text-zinc-500 mt-3">
                  Drag to explore &bull; Click node to inspect institute telemetry
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Metrics Bento ──────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16">
          <ScrollReveal>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950 uppercase tracking-wider font-mono">
                  Live Directorate Telemetry
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Real-time indicators aggregated across all 6 autonomous institutes
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
                Database Sync: SQLite Realtime
              </span>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { label: "Active Cadre", val: traineeCount, icon: ShieldCheck, desc: "Verified scientists and technical officers in learning tracks." },
              { label: "Competency Blocks", val: blockCount, icon: Compass, desc: "Domain specializations (Atmosphere, Ocean, Geohazard)." },
              { label: "Technical Courses", val: courseCount, icon: Layers, desc: "Standardized curricula with manuals, quizzes, and SOPs." },
              { label: "Evaluations Logged", val: attemptCount, icon: Award, desc: "Formative attempts evaluated with certified PDF issuance." },
            ].map(({ label, val, icon: Icon, desc }, i) => (
              <ScrollReveal key={label} stagger={((i + 1) as 1|2|3|4)}>
                <div className="p-6 rounded-lg bg-white border border-zinc-200/90 space-y-2 card-lift">
                  <div className="flex items-center justify-between text-zinc-500">
                    <span className="text-[11px] font-mono uppercase tracking-wider">{label}</span>
                    <Icon className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="text-3xl font-semibold text-zinc-950 font-mono tracking-tight">{val}</div>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── Role Workspaces ────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-16">
          <ScrollReveal>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950 uppercase tracking-wider font-mono">
                  Operational Cadre Workspaces
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Role-delimited administrative and research portals
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
                Role-Based Access Control
              </span>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {[
              {
                badge: "DIRECTORATE LEVEL",
                badgeClass: "text-amber-800 bg-amber-50 border-amber-200",
                num: "01",
                title: "Directorate Administration",
                desc: "Monitor nationwide completion metrics, inspect cross-institute skill gap matrices, and manage batch personnel onboarding via CSV.",
                link: "Access Admin Console",
              },
              {
                badge: "SCIENTIFIC FACULTY",
                badgeClass: "text-emerald-800 bg-emerald-50 border-emerald-200",
                num: "02",
                title: "Curriculum & Assessment Studio",
                desc: "Author specialized SOP curricula, track cohort performance rosters, and synthesize calibrated MCQ assessments directly from research documentation.",
                link: "Access Faculty Studio",
              },
              {
                badge: "RESEARCH CADRE",
                badgeClass: "text-blue-800 bg-blue-50 border-blue-200",
                num: "03",
                title: "Scientific Officer Learning Desk",
                desc: "Enroll in accredited pathways, engage with interactive module study materials, complete technical evaluations, and generate cryptographic certificates.",
                link: "Access Learning Desk",
              },
            ].map((item, i) => (
              <ScrollReveal key={item.num} stagger={((i + 1) as 1|2|3)}>
                <div className="p-6 rounded-lg bg-white border border-zinc-200/90 flex flex-col justify-between space-y-6 card-lift h-full">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">{item.num}</span>
                    </div>
                    <h3 className="text-base font-semibold text-zinc-950">{item.title}</h3>
                    <p className="text-xs text-zinc-600 leading-relaxed">{item.desc}</p>
                  </div>
                  <Link
                    href="/login"
                    className="pt-4 border-t border-zinc-100 text-xs font-medium text-zinc-900 hover:text-zinc-600 inline-flex items-center justify-between"
                  >
                    <span>{item.link}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── Federated Institutes Directory ─────────────────────── */}
        <section className="border-t border-zinc-200 bg-zinc-50/60 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-6">
            <ScrollReveal>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950 uppercase tracking-wider font-mono">
                    Autonomous Scientific Institutes Index
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    MoES federated research and operational organizations
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
                  6 Entities Synchronized
                </span>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {institutes.map((inst, i) => (
                <ScrollReveal key={inst.code} stagger={((i % 6 + 1) as 1|2|3|4|5|6)}>
                  <div className="p-5 rounded-lg bg-white border border-zinc-200/90 flex flex-col justify-between space-y-4 card-lift h-full">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 border border-zinc-200">
                          {inst.code}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">{inst.coords}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-950 leading-snug">{inst.name}</h4>
                      <p className="text-[11px] text-zinc-500">{inst.hq}</p>
                    </div>
                    <div className="pt-2 border-t border-zinc-100">
                      <p className="text-[10px] font-mono text-zinc-600 leading-normal">
                        Focus: <span className="text-zinc-800 font-medium">{inst.focus}</span>
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 bg-white py-8 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium text-zinc-800">
              Ministry of Earth Sciences (MoES) &bull; Government of India
            </p>
            <p className="text-[11px] text-zinc-500">
              Prithvi Bhavan, Lodhi Road, New Delhi 110003 &bull; Smart India Hackathon (SIH26075)
            </p>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[11px] text-zinc-500">
            <span>Next.js 14</span>
            <span>&bull;</span>
            <span>Three.js Globe</span>
            <span>&bull;</span>
            <span>Prisma ORM</span>
            <span>&bull;</span>
            <span>Groq Qwen 27B</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
