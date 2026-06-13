export { middlewareAuth as middleware } from "@/auth.config";

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
