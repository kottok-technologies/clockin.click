import { withAuth } from "next-auth/middleware";

const isAdminRoute = (pathname: string) =>
    pathname === "/users" ||
    pathname.startsWith("/users/") ||
    pathname === "/reports" ||
    pathname.startsWith("/reports/");

export default withAuth({
    callbacks: {
        authorized: ({ token, req }) =>
            !isAdminRoute(req.nextUrl.pathname) || Boolean(token),
    },
});

/*
 * Keep the public-route decision in the callback as well as the matcher. This
 * prevents a framework or deployment adapter from accidentally applying admin
 * authentication to the kiosk home page.
 */
export const config = {
    matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
