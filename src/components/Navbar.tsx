"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Award,
  BarChart3,
  LogOut,
  Compass,
  BrainCircuit,
  GraduationCap,
} from "lucide-react";

interface NavbarProps {
  role: "ADMIN" | "TRAINER" | "TRAINEE";
}

export function Navbar({ role }: NavbarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const adminLinks = [
    { href: "/admin", label: "Executive Console", icon: LayoutDashboard },
    { href: "/admin/pathways", label: "Competency Blocks", icon: Compass },
    { href: "/admin/users", label: "Personnel Directory", icon: Users },
    { href: "/admin/analytics", label: "Readiness Telemetry", icon: BarChart3 },
  ];

  const trainerLinks = [
    { href: "/trainer", label: "Curriculum Tracks", icon: BookOpen },
    { href: "/trainer/create-course", label: "Author Course", icon: GraduationCap },
    { href: "/trainer/roster", label: "Cohort Roster", icon: Users },
    { href: "/trainer/ai-studio", label: "Assessment Studio", icon: BrainCircuit },
  ];

  const traineeLinks = [
    { href: "/trainee", label: "My Learning Desk", icon: LayoutDashboard },
    { href: "/trainee/catalog", label: "Competency Catalog", icon: BookOpen },
    { href: "/trainee/certificates", label: "Verified Credentials", icon: Award },
  ];

  const links = role === "ADMIN" ? adminLinks : role === "TRAINER" ? trainerLinks : traineeLinks;

  const roleTag =
    role === "ADMIN"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : role === "TRAINER"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : "bg-blue-50 text-blue-800 border-blue-200";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Top micro status bar */}
      <div className="border-b border-zinc-100 bg-[#FBFBF9] text-[10px] font-mono text-zinc-500 py-1 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-zinc-800">MoES &bull; CAPACITY CONNECT</span>
            <span>/</span>
            <span className="text-zinc-600">Smart India Hackathon SIH26075</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-zinc-700">Autonomous Network Synced</span>
            </span>
            <span className="hidden sm:inline text-zinc-400">|</span>
            <span className="hidden sm:inline">IST 24h Telemetry</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-15 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link href={`/${role.toLowerCase()}`} className="flex items-center space-x-3 py-2">
            <div className="w-7 h-7 rounded bg-zinc-950 flex items-center justify-center text-white text-xs font-bold font-mono tracking-wider">
              CC
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm tracking-tight text-zinc-950">
                  Capacity Connect
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${roleTag}`}>
                  {role}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">Ministry of Earth Sciences</p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-zinc-200">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
                    isActive
                      ? "bg-zinc-100 text-zinc-950 font-semibold border border-zinc-200"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 border border-transparent"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-zinc-900 leading-tight">
              {session?.user?.name || "MoES Officer"}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">
              {(session?.user as any)?.department || "MoES General"} &bull; {(session?.user as any)?.role}
            </p>
          </div>

          <div className="h-6 w-px bg-zinc-200 hidden sm:block" />

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out of portal"
            className="px-2.5 py-1.5 rounded text-xs text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200 transition-all inline-flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
