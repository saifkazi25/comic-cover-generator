// app/api/handoff/route.ts
import { NextRequest, NextResponse } from "next/server";

// Ensure this route is always built (no static 404)
export const dynamic = "force-dynamic";

/**
 * GET /api/handoff?profileId=...&name=...&bio=...&selfieUrl=...&return=...
 * - Sets a profileId cookie on the comic app domain
 * - Redirects to /comic (forwarding any other params)
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const profileId =
    url.searchParams.get("profileId") ||
    url.searchParams.get("profile") ||        // legacy support
    "";

  // forward all other params unchanged
  const pass = new URLSearchParams(url.searchParams);
  pass.delete("profileId");
  pass.delete("profile");

  // Redirect target (edit if you want another landing page)
  const redirectTo = new URL("/comic", url.origin);
  if ([...pass.keys()].length > 0) {
    redirectTo.search = pass.toString();
  }

  const res = NextResponse.redirect(redirectTo);

  // Cookie is readable by client (for banner) and server (for uploads)
  res.cookies.set("profileId", encodeURIComponent(profileId), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return res;
}
