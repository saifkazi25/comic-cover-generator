// app/api/handoff/route.ts  (in the comic app)
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profileId") || "";
  const passThrough = new URLSearchParams(req.nextUrl.searchParams);
  passThrough.delete("profileId"); // cookie handles this now

  const redirectTo = new URL("/comic", req.url);
  if ([...passThrough.keys()].length > 0) {
    redirectTo.search = passThrough.toString();
  }

  const res = NextResponse.redirect(redirectTo);
  res.cookies.set("profileId", encodeURIComponent(profileId), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
