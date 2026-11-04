import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/services/supabase/server";

/**
 * Destino dos links de e-mail (confirmação de cadastro e redefinição de senha).
 * Usa token_hash para funcionar mesmo se o link abrir em outro navegador ou aparelho.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?erro=link-invalido", request.url));
}
