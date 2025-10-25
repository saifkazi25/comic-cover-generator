// app/api/handoff/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure it deploys as a function

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const profileId =
    url.searchParams.get("profileId") ||
    url.searchParams.get("profile") ||
    "";

  // forward all other params
  const pass = new URLSearchParams(url.searchParams);
  pass.delete("profileId");
  pass.delete("profile");

  // where to land after cookie is set
  const redirectTo = new URL("/comic", url.origin);
  if ([...pass.keys()].length > 0) {
    redirectTo.search = pass.toString();
  }

  const res = NextResponse.redirect(redirectTo);

  res.cookies.set("profileId", encodeURIComponent(profileId), {
    path: "/",
    httpOnly: false,  // client code can show the banner
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
