import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { RECOVERY_LINK_PATH } from "@/lib/recovery-link";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/services/supabase/server";

/**
 * Destino dos links de confirmação de cadastro e dos links antigos de redefinição de senha
 * (os novos vão para /auth/recuperar). Aceita:
 * - `code`: templates padrão do Supabase. Só cria a sessão no navegador que pediu o e-mail.
 * - `token_hash`: templates de supabase/templates/, que exigem SMTP próprio no projeto.
 *   Funciona em qualquer navegador.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get("next"));

  const supabase = await createClient();
  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
  }

  const failure = next === "/redefinir-senha" ? RECOVERY_LINK_PATH : "/login?erro=link-invalido";
  return NextResponse.redirect(new URL(verified ? next : failure, request.url));
}
