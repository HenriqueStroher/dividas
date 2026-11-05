import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/types/database";

/** Cliente do Supabase com a sessão do usuário atual; todas as consultas passam pelo RLS. */
export async function createClient() {
  // Dados por usuário nunca são pré-renderizados. Precisa vir antes da criação do cliente,
  // que chama Date.now(): sem isso, o Next acusa "unstable value" em desenvolvimento.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components não podem gravar cookies; o proxy renova a sessão.
          }
        },
      },
    },
  );
}

/**
 * Cliente sem sessão para pedir o e-mail de redefinição de senha. O cliente com cookies sempre usa
 * PKCE, e aí o link só abre no navegador que fez o pedido. No fluxo implícito, o link traz os tokens
 * e funciona em qualquer navegador, inclusive no navegador interno do app de e-mail.
 */
export function createPasswordRecoveryClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
