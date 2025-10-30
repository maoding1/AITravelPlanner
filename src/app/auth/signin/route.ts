import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(new URL("/auth?error=missing_fields", request.url));
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    const message = signInError.message ?? "unknown_error";

    // Avoid triggering Supabase security cooldown when the same request is repeated quickly.
    if (message.toLowerCase().includes("for security purposes")) {
      return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(message)}`, request.url));
    }

    if (message.toLowerCase().includes("invalid login credentials")) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(signUpError.message)}`, request.url));
      }

      if (!signUpData.session) {
        return NextResponse.redirect(new URL("/auth?message=check_email", request.url));
      }

      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.redirect(new URL(`/auth?error=${encodeURIComponent(message)}`, request.url));
  }

  if (!signInData?.session) {
    return NextResponse.redirect(new URL("/auth?message=check_email", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

export const dynamic = "force-dynamic";
