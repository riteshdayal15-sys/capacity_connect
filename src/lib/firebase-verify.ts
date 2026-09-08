import crypto from "crypto";

/**
 * Verifies Firebase Google ID tokens the way Firebase documents:
 * fetch Google's public signing keys for Secure Tokens, verify the RS256
 * signature, then check aud / iss / sub / exp. No firebase-admin (and no
 * service-account key file) required.
 */
export interface VerifiedGoogleToken {
  email: string;
  emailVerified: boolean;
  name?: string;
  exp: number;
}

const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

export async function getSecureTokenCerts(): Promise<Record<string, string>> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERT_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new TokenVerifyError("certs-unavailable", "Could not fetch Google signing keys.");
  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get("cache-control") || "";
  const m = cacheControl.match(/max-age=(\d+)/);
  const ttlMs = (m ? Math.min(Number(m[1]), 3600) : 300) * 1000;
  certCache = { certs, expiresAt: Date.now() + ttlMs };
  return certs;
}

function b64urlDecode(input: string): Buffer {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export class TokenVerifyError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function isEmailVerified(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1 || raw === "1";
}

/** Primary check: real cryptographic verification of a Firebase ID token. */
export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
  certsOverride?: Record<string, string>
): Promise<VerifiedGoogleToken> {
  const parts = String(idToken).split(".");
  if (parts.length !== 3) throw new TokenVerifyError("malformed", "Token is malformed.");

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(b64urlDecode(parts[0]).toString("utf8"));
    payload = JSON.parse(b64urlDecode(parts[1]).toString("utf8"));
  } catch {
    throw new TokenVerifyError("malformed", "Token is malformed.");
  }

  if (header.alg !== "RS256") throw new TokenVerifyError("bad-alg", "Unexpected token algorithm.");
  if (!header.kid) throw new TokenVerifyError("no-kid", "Token key id is missing.");

  let certs: Record<string, string>;
  try {
    certs = certsOverride ?? (await getSecureTokenCerts());
  } catch {
    throw new TokenVerifyError("certs-unavailable", "Could not fetch Google signing keys.");
  }
  const cert = certs[header.kid];
  if (!cert) throw new TokenVerifyError("unknown-kid", "Unknown token signing key.");

  let publicKey: crypto.KeyLike;
  try {
    publicKey = crypto.createPublicKey(cert);
  } catch {
    throw new TokenVerifyError("bad-key", "Invalid Google signing key.");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(parts[0] + "." + parts[1]);
  let valid = false;
  try {
    valid = verifier.verify(publicKey, b64urlDecode(parts[2]));
  } catch {
    valid = false;
  }
  if (!valid) throw new TokenVerifyError("bad-signature", "Token signature is invalid.");

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId)
    throw new TokenVerifyError("bad-audience", `Token audience mismatch (got ${payload.aud}).`);
  if (payload.iss !== `https://securetoken.google.com/${projectId}`)
    throw new TokenVerifyError("bad-issuer", `Token issuer mismatch (got ${payload.iss}).`);
  if (typeof payload.sub !== "string" || !payload.sub)
    throw new TokenVerifyError("bad-subject", "Token subject is missing.");
  if (typeof payload.exp !== "number" || payload.exp <= nowSec)
    throw new TokenVerifyError("expired", "Token has expired.");
  if (typeof payload.iat === "number" && payload.iat > nowSec + 300)
    throw new TokenVerifyError("bad-issued-at", "Token issued-at is in the future.");
  if (typeof payload.auth_time === "number" && payload.auth_time > nowSec + 300)
    throw new TokenVerifyError("bad-auth-time", "Token auth_time is in the future.");

  return {
    email: String(payload.email || ""),
    emailVerified: isEmailVerified(payload.email_verified),
    name: payload.name ? String(payload.name) : undefined,
    exp: payload.exp,
  };
}

/** Fallback check for Google OAuth ID tokens via Google's tokeninfo endpoint. */
export async function verifyViaTokenInfo(idToken: string): Promise<any> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new TokenVerifyError("tokeninfo-rejected", "Token rejected by Google.");
  return res.json();
}
