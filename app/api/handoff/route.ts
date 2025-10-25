// app/api/handoff/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure a serverless function is deployed

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // support both ?profileId= and legacy ?profile=
  const profileId =
    url.searchParams.get("profileId") ??
    url.searchParams.get("profile") ??
    "";

  // forward all other params to /comic
  const pass = new URLSearchParams(url.searchParams);
  pass.delete("profileId");
  pass.delete("profile");

  const redirectTo = new URL("/comic", url.origin);
  if ([...pass.keys()].length > 0) redirectTo.search = pass.toString();

  const res = NextResponse.redirect(redirectTo);

  // cookie readable by client (banner) + server (Cloudinary upload route)
  res.cookies.set("profileId", encodeURIComponent(profileId), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
