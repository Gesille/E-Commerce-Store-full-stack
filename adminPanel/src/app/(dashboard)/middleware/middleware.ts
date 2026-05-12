// admin-panel/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("ACCESS_TOKEN_SECRET")?.value;

  if (!token) {
    // No cookie = not logged in, redirect to client
    return NextResponse.redirect(
      new URL(process.env.NEXT_PUBLIC_CLIENT_URL!)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|public).*)"],
};