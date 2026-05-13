import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboardPage && !isLoggedIn) {
    return Response.redirect(new URL("/auth/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
