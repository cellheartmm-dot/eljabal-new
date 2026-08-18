import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("next-auth.session-token", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });
  response.cookies.set("__Secure-next-auth.session-token", "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });
  return response;
}
