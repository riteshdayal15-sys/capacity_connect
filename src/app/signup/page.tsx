"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("IMD New Delhi (Meteorology)");
  const [selectedRole, setSelectedRole] = useState<"TRAINEE" | "TRAINER">("TRAINEE");
  const [trainerRequestNote, setTrainerRequestNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const departments = [
    "IMD New Delhi (Meteorology)",
    "INCOIS Hyderabad (Ocean Services)",
    "NIOT Chennai (Ocean Technology)",
    "IITM Pune (Tropical Meteorology)",
    "NCMRWF Noida (Weather Modeling)",
    "NCPOR Goa (Polar & Antarctic)",
    "MoES HQ New Delhi (Directorate)",
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const applyTrainer = selectedRole === "TRAINER";
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          department,
          applyTrainer,
          trainerRequestNote: applyTrainer ? trainerRequestNote : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      // Immediately sign in upon successful registration
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (!loginRes?.ok || loginRes?.error) {
        window.location.href = "/login";
        return;
      }

      window.location.href = "/trainee";
    } catch (err: any) {
      setError(err.message || "An error occurred during account creation.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const { auth, googleProvider } = await import("@/lib/firebase");

      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      if (!fbUser.email) throw new Error("Google did not return an email.");

      const idToken = await fbUser.getIdToken();
      const syncRes = await fetch("/api/auth/firebase-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fbUser.email,
          name: fbUser.displayName || name || "Google User",
          department,
          idToken,
        }),
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) throw new Error(syncData.error || "Google sync failed.");

      const loginRes = await signIn("credentials", {
        redirect: false,
        email: fbUser.email,
        password: syncData.bridgePassword,
      });
      if (!loginRes?.ok || loginRes?.error) throw new Error("Session creation failed. Please try again.");

      window.location.href = syncData.role === "TRAINER" ? "/trainer" : "/trainee";
    } catch (err: any) {
      setError(err?.message || "Google sign-up failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] bg-grid-pattern text-zinc-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-zinc-200 selection:text-zinc-950">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center space-x-2.5 mb-2">
          <div className="w-8 h-8 rounded bg-zinc-950 flex items-center justify-center font-mono font-bold text-white text-xs tracking-wider">
            MoES
          </div>
          <div className="text-left">
            <span className="font-semibold text-sm tracking-tight text-zinc-950 block">Capacity Connect</span>
            <span className="text-[10px] font-mono text-zinc-500 block">Ministry of Earth Sciences</span>
          </div>
        </Link>
        <h1 className="font-serif-heading text-3xl font-normal tracking-tight text-zinc-950">
          Create Account
        </h1>
        <p className="text-xs text-zinc-600">
          Join the national capacity building &amp; scientific training platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white border border-zinc-200/90 py-8 px-6 rounded-lg sm:px-8 space-y-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          {error && (
            <div className="p-3 rounded bg-red-50/80 border border-red-200 text-red-700 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Clean Role Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Select Registration Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setSelectedRole("TRAINEE")}
                className={`py-2 px-3 rounded-md text-xs font-medium transition-all text-center ${
                  selectedRole === "TRAINEE"
                    ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/80 font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Trainee / Officer
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("TRAINER")}
                className={`py-2 px-3 rounded-md text-xs font-medium transition-all text-center ${
                  selectedRole === "TRAINER"
                    ? "bg-white text-zinc-950 shadow-xs border border-zinc-200/80 font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Trainer / Faculty
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 px-0.5">
              {selectedRole === "TRAINEE"
                ? "Instant enrollment into courses, assessments, and AI tutoring."
                : "Submit application for syllabus authoring & grading (pending Admin approval)."}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedRole === "TRAINEE" ? "e.g. Rahul Verma" : "e.g. Dr. Priya Sharma"}
                className="w-full px-3 py-2 rounded bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={selectedRole === "TRAINEE" ? "rahul@imd.gov.in" : "priya@incois.gov.in"}
                className="w-full px-3 py-2 rounded bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 rounded bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1">
                Institute / Organization
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded bg-white border border-zinc-200 text-zinc-900 text-xs focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Trainer Application Note (only shown when registering as Trainer) */}
            {selectedRole === "TRAINER" && (
              <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-1.5">
                <label className="block text-xs font-medium text-amber-950">
                  Faculty Specialization &amp; Credentials
                </label>
                <textarea
                  rows={2}
                  required
                  value={trainerRequestNote}
                  onChange={(e) => setTrainerRequestNote(e.target.value)}
                  placeholder="e.g. Scientist-D at INCOIS, 6 years in numerical weather forecasting & marine sensors."
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-amber-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-700 text-xs"
                />
                <p className="text-[10px] text-amber-800/90">
                  Your request will be submitted to the Directorate for review. You can log in immediately as an officer while review is pending.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center py-2.5 px-4 rounded font-medium text-xs text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  <span>
                    {selectedRole === "TRAINEE" ? "Register as Trainee" : "Register & Request Trainer Role"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </button>
          </form>

          {/* Clean Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-white px-2.5 text-zinc-400 font-medium">OR</span>
            </div>
          </div>

          {/* Google SSO */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-2.5 px-4 rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 font-medium text-xs flex items-center justify-center space-x-2.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? "Connecting..." : "Continue with Google"}</span>
          </button>

          <div className="text-center pt-2">
            <p className="text-xs text-zinc-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-zinc-950 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
