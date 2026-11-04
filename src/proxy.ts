import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_ONLY_PATHS = ["/login", "/cadastro", "/esqueci-senha"];

/** Renova a sessão do Supabase e redireciona conforme o usuário está logado ou não. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicOnly = PUBLIC_ONLY_PATHS.includes(pathname);
  const isAuthCallback = pathname.startsWith("/auth/");

  if (!user && !isPublicOnly && !isAuthCallback) {
    return redirectKeepingCookies(request, response, "/login");
  }
  if (user && isPublicOnly) {
    return redirectKeepingCookies(request, response, "/");
  }

  return response;
}

function redirectKeepingCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  // Fora do proxy: arquivos estáticos e tudo o que o PWA precisa baixar sem sessão.
  matcher: ["/((?!_next/static|_next/image|icon.png|apple-icon.png|manifest.webmanifest|icons/).*)"],
};
