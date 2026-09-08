import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  verifyFirebaseIdToken,
  verifyViaTokenInfo,
  isEmailVerified,
  TokenVerifyError,
} from "@/lib/firebase-verify";

import { checkRateLimit } from "@/lib/rate-limit";

// Called after a successful Firebase Google popup. The client MUST send the
// Firebase ID token — we verify its signature/expiry/audience with Google
// before trusting the email. Previously this route trusted a bare email
// string, letting anyone mint a login session for ANY account (including
// admins) and silently rotating the victim's password. Never go back to that.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "firebase-sync-client";
  const limitCheck = checkRateLimit(`fb-sync:${ip}`, 10, 60000);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in sync requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const { email, name, role, department, idToken } = await req.json();

    if (!email || !idToken) {
      return NextResponse.json(
        { error: "Email and a valid Google sign-in token are required." },
        { status: 400 }
      );
    }

    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error("firebase-sync misconfigured: missing Firebase project ID env.");
      return NextResponse.json(
        { error: "Google sign-in is not configured on the server." },
        { status: 500 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Primary: real cryptographic verification of the Firebase ID token
    // (RS256 signature against Google's Secure Token keys + aud/iss/exp).
    let tokenEmail = "";
    let tokenName: string | undefined;
    let emailVerified = false;
    try {
      const v = await verifyFirebaseIdToken(String(idToken), projectId);
      tokenEmail = v.email.toLowerCase().trim();
      tokenName = v.name;
      emailVerified = v.emailVerified;
    } catch (err: any) {
      // Fallback for Google OAuth ID tokens (different issuer/key set):
      // validate via Google's tokeninfo endpoint and re-check the claims.
      const code = err instanceof TokenVerifyError ? err.code : "unknown";
      if (code === "certs-unavailable" || code === "unknown-kid" || code === "bad-issuer") {
        try {
          const info: any = await verifyViaTokenInfo(String(idToken));
          const nowSec = Math.floor(Date.now() / 1000);
          if (!info?.aud || info.aud !== projectId)
            throw new TokenVerifyError("bad-audience", "Token audience mismatch.");
          tokenEmail = String(info?.email || "").toLowerCase().trim();
          tokenName = info?.name ? String(info.name) : undefined;
          emailVerified = isEmailVerified(info?.email_verified ?? info?.verified_email);
          if (!info?.exp || Number(info.exp) <= nowSec)
            throw new TokenVerifyError("expired", "Token has expired.");
        } catch (fallbackErr: any) {
          console.error(
            "firebase-sync verify failed (primary=%s fallback=%s)",
            code,
            fallbackErr instanceof TokenVerifyError ? fallbackErr.code : fallbackErr?.message
          );
          return NextResponse.json({ error: messageFor(fallbackErr) }, { status: 401 });
        }
      } else {
        console.error("firebase-sync verify failed: %s", code);
        return NextResponse.json({ error: messageFor(err) }, { status: 401 });
      }
    }

    // The token must belong to THIS email address, with a verified address.
    if (!tokenEmail || tokenEmail !== cleanEmail) {
      console.error("firebase-sync verify failed: email-mismatch");
      return NextResponse.json(
        { error: "Google sign-in verification failed. Please try again." },
        { status: 401 }
      );
    }
    if (!emailVerified) {
      return NextResponse.json(
        { error: "This Google email address is not verified." },
        { status: 401 }
      );
    }

    const secret = process.env.NEXTAUTH_SECRET || "capacity-connect-secret-key";
    const ts = Date.now().toString();
    const sig = crypto.createHmac("sha256", secret).update(`${cleanEmail}:${ts}`).digest("hex");
    const bridgePassword = `bridge:${ts}:${sig}`;

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });

    let assignedRole: string;
    if (!existing) {
      const placeholderHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);
      await prisma.user.create({
        data: {
          email: cleanEmail,
          name: String(name || tokenName || "Google User").trim(),
          passwordHash: placeholderHash,
          // Google onboarding can never mint staff roles — admins promote later.
          role: "TRAINEE",
          department: department || "IMD New Delhi / Pune",
        },
      });
      assignedRole = "TRAINEE";
    } else {
      // SECURITY: PRESERVE existing user passwordHash so credentials sign-in is NOT destroyed!
      assignedRole = existing.role;
    }

    return NextResponse.json({ bridgePassword, role: assignedRole }, { status: 200 });
  } catch (err: any) {
    console.error("firebase-sync error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to sync Google user." },
      { status: 500 }
    );
  }
}

// Specific, non-sensitive messages so the login screen tells the user
// what actually went wrong instead of a generic failure.
function messageFor(err: any): string {
  const code = err instanceof TokenVerifyError ? err.code : undefined;
  if (code === "expired") return "Google session expired. Please try signing in again.";
  if (code === "bad-audience" || code === "bad-issuer")
    return "Google token was not issued for this app. Please check the Firebase project configuration.";
  if (code === "certs-unavailable")
    return "Could not reach Google to verify sign-in. Please check your connection and try again.";
  return "Google sign-in verification failed. Please try again.";
}
