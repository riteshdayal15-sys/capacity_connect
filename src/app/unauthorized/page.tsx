import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] text-zinc-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-4 text-zinc-700">
        <ShieldAlert className="w-6 h-6 stroke-[1.75]" />
      </div>
      <h1 className="text-xl font-semibold mb-1 text-zinc-950">Access Restricted</h1>
      <p className="text-zinc-600 max-w-md text-xs mb-6 leading-relaxed">
        You do not have the required role permissions to view this directorate workspace. Please log in with an authorized account.
      </p>
      <div className="flex space-x-3">
        <Link
          href="/login"
          className="px-4 py-2 rounded-md bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-800 border border-zinc-200 transition-colors"
        >
          Switch Account
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
