"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const targetEmail = loginEmail || email;
    const targetPassword = loginPassword || password;

    if (!targetEmail) {
      setError("Please enter your email address");
      return;
    }
    if (!targetPassword) {
      setError("Please enter your password");
      return;
    }

    if (loginEmail) setEmail(loginEmail);
    if (loginPassword) setPassword(loginPassword);

    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: targetEmail,
        password: targetPassword,
      });

      if (res?.error) {
        setError("Invalid email or password. Please verify credentials.");
        setLoading(false);
        return;
      }

      const session = await getSession();
      const role = (session?.user as any)?.role;

      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "TRAINER") {
        router.push("/trainer");
      } else if (role === "TRAINEE") {
        router.push("/trainee");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError("Sign in error: " + err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      // Step 1: Firebase popup
      setError("Step 1: Opening Google popup…");
      const { signInWithPopup } = await import("firebase/auth");
      const { auth, googleProvider } = await import("@/lib/firebase");
      let cred: any;
      try {
        cred = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        throw new Error("Popup failed: " + (popupErr?.code || popupErr?.message));
      }
      const fbUser = cred.user;
      if (!fbUser.email) throw new Error("Google did not return an email.");

      // Step 2: Get ID token
      setError("Step 2: Getting token…");
      const idToken = await fbUser.getIdToken();

      // Step 3: Sync with database
      setError("Step 3: Syncing account…");
      const syncRes = await fetch("/api/auth/firebase-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fbUser.email,
          name: fbUser.displayName || "Google User",
          idToken,
        }),
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) throw new Error("Sync failed (" + syncRes.status + "): " + (syncData.error || "unknown"));

      // Step 4: Create NextAuth session
      setError("Step 4: Creating session…");
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: fbUser.email,
        password: syncData.bridgePassword,
      });
      if (loginRes?.error) throw new Error("Session failed: " + loginRes.error);

      // Success — clear error and redirect
      setError("");
      const role = syncData.role as string | undefined;
      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "TRAINER") {
        router.push("/trainer");
      } else {
        router.push("/trainee");
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
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
          Sign In
        </h1>
        <p className="text-xs text-zinc-600">
          Enter your credentials to access your dashboard
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

          {/* Standard Login Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-zinc-800 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@moes.gov.in"
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
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center py-2.5 px-4 rounded font-medium text-xs text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            >
              {loading ? (
                "Signing In..."
              ) : (
                <>
                  <span>Sign In</span>
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

          {/* Quick Demo Accounts for Hackathon Evaluators */}
          <div className="pt-3 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Quick Demo Access:
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <button
                type="button"
                onClick={() => handleLogin("admin@moes.gov.in", "password123")}
                className="py-1 px-2 rounded border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-[10px] font-mono font-medium text-amber-900 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleLogin("trainer.incois@moes.gov.in", "password123")}
                className="py-1 px-2 rounded border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-[10px] font-mono font-medium text-emerald-900 transition-colors"
              >
                Trainer
              </button>
              <button
                type="button"
                onClick={() => handleLogin("rahul.v@imd.gov.in", "password123")}
                className="py-1 px-2 rounded border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[10px] font-mono font-medium text-blue-900 transition-colors"
              >
                Trainee
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-zinc-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-zinc-950 hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
