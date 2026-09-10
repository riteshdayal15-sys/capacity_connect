import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "moes-capacity-connect-super-secret-key-2025";
}
if (process.env.VERCEL_URL && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

const providers: any[] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Invalid credentials");
      }

      const cleanEmail = credentials.email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user || !user.passwordHash) {
        throw new Error("User not found");
      }

      // Check for ephemeral HMAC bridge token from Google/Firebase sync
      if (credentials.password.startsWith("bridge:")) {
        const parts = credentials.password.split(":");
        if (parts.length === 3) {
          const [, tsStr, sig] = parts;
          const ts = parseInt(tsStr, 10);
          const now = Date.now();
          if (!isNaN(ts) && now - ts >= 0 && now - ts < 60000) {
            const expectedSig = crypto
              .createHmac("sha256", NEXTAUTH_SECRET)
              .update(`${cleanEmail}:${tsStr}`)
              .digest("hex");
            if (sig === expectedSig) {
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
              };
            }
          }
        }
        throw new Error("Invalid or expired Google bridge session");
      }

      const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isValid) {
        throw new Error("Invalid email or password");
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        specialization: user.specialization,
        assignedBlockId: user.assignedBlockId,
      };
    },
  }),
];

// Add Google provider if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const cleanEmail = user.email.toLowerCase().trim();

        // Check if user exists in database
        let dbUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        // If user doesn't exist yet, auto-provision as TRAINEE
        if (!dbUser) {
          const randomSecret = crypto.randomBytes(32).toString("hex");
          const secureOAuthHash = await bcrypt.hash(randomSecret, 10);
          dbUser = await prisma.user.create({
            data: {
              email: cleanEmail,
              name: user.name || "MoES Trainee",
              role: "TRAINEE",
              department: "IMD (Observation Cadre)",
              passwordHash: secureOAuthHash,
            },
          });
        }

        // Attach fields so jwt callback receives them
        (user as any).id = dbUser.id;
        (user as any).role = dbUser.role;
        (user as any).department = dbUser.department;
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
        token.specialization = (user as any).specialization;
        token.assignedBlockId = (user as any).assignedBlockId;
      } else if (token.id) {
        // Fetch up-to-date role, department, and assigned specialization from database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            department: true,
            specialization: true,
            assignedBlockId: true,
            assignedBlock: { select: { title: true } },
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.department = dbUser.department;
          token.specialization = dbUser.specialization || dbUser.assignedBlock?.title || undefined;
          token.assignedBlockId = dbUser.assignedBlockId || undefined;
          token.assignedBlockTitle = dbUser.assignedBlock?.title || undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).department = token.department as string;
        (session.user as any).specialization = token.specialization as string | undefined;
        (session.user as any).assignedBlockId = token.assignedBlockId as string | undefined;
        (session.user as any).assignedBlockTitle = token.assignedBlockTitle as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: NEXTAUTH_SECRET,
};
