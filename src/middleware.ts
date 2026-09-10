import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role as string | undefined;

    // Determine the user's authorized home dashboard based on verified token role
    const userDashboard =
      role === "ADMIN"
        ? "/admin"
        : role === "TRAINER"
        ? "/trainer"
        : role === "TRAINEE"
        ? "/trainee"
        : "/login";

    // 1. Admin Profile / Dashboard: ONLY users with the ADMIN role can access
    // Non-admins attempting to access any admin route are denied and redirected to their own dashboard
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      const redirectUrl = new URL(userDashboard, req.url);
      redirectUrl.searchParams.set("access_denied", "admin");
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Trainer Profile / Dashboard: ONLY users with the TRAINER role can access
    // Non-trainers (e.g. Trainees) attempting to access trainer route are redirected to their own dashboard
    if (pathname.startsWith("/trainer") && role !== "TRAINER") {
      const redirectUrl = new URL(userDashboard, req.url);
      redirectUrl.searchParams.set("access_denied", "trainer");
      return NextResponse.redirect(redirectUrl);
    }

    // 3. Trainee Profile / Dashboard: ONLY users with the TRAINEE role can access
    // Non-trainees attempting to access trainee route are redirected to their own dashboard
    if (pathname.startsWith("/trainee") && role !== "TRAINEE") {
      const redirectUrl = new URL(userDashboard, req.url);
      redirectUrl.searchParams.set("access_denied", "trainee");
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/trainer/:path*", "/trainee/:path*"],
};
