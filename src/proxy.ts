import { middlewareAuth } from "@/auth.config";

export default middlewareAuth((request) => {
  if (!request.auth) {
    return Response.redirect(new URL("/login", request.url));
  }
});

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
