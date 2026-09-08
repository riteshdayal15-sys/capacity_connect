import Link from "next/link";
import { Compass, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FBFBF9] text-zinc-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-4 text-zinc-700 shadow-xs">
        <Compass className="w-7 h-7 stroke-[1.5]" />
      </div>

      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 mb-2">
        Error 404 &bull; Page Not Found
      </span>

      <h1 className="text-2xl font-serif-heading font-normal text-zinc-950 mt-1 mb-2">
        Resource or Directorate Not Located
      </h1>

      <p className="text-zinc-600 max-w-md text-xs mb-6 leading-relaxed">
        The requested URL, curriculum track, or administrative asset does not exist or has been relocated within the Ministry of Earth Sciences Cadre Portal.
      </p>

      <div className="flex items-center space-x-3">
        <Link
          href="/login"
          className="px-4 py-2 rounded-md bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 border border-zinc-200 transition-colors flex items-center space-x-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Sign In</span>
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors flex items-center space-x-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Portal Home</span>
        </Link>
      </div>
    </div>
  );
}
