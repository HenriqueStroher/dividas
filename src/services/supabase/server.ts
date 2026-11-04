import { createServerClient } from "@supabase/ssr";
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
