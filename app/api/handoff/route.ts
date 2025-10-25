// app/api/handoff/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profileId") || "";
  const redirectTo = new URL("/comic", req.url); // or wherever you want to land

  const res = NextResponse.redirect(redirectTo);
  // 1 year cookie, lax, path=/
  res.cookies.set("profileId", encodeURIComponent(profileId), {
    path: "/",
    httpOnly: false, // allow client to read if you want to show it in UI
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
