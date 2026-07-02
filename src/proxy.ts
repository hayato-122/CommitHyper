import { proxyAuth } from "@/auth.config";

export default proxyAuth((request) => {
  if (!request.auth) {
    return Response.redirect(new URL("/login", request.url));
  }
});

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/api/repos/:path*"],
};
