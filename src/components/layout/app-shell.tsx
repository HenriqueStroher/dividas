import { LogOutIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { NavLink, NavLinkView } from "@/components/layout/nav-link";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Dívidas
        </Link>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Sair">
            <LogOutIcon />
          </Button>
        </form>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-28">{children}</main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-10 border-t bg-background pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 items-center">
          <BottomNavLink href="/" label="Saldos" icon={<UsersIcon className="size-5" />} />
          <Link
            href="/dividas/nova"
            aria-label="Nova dívida"
            className="mx-auto my-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <PlusIcon className="size-6" />
          </Link>
          <BottomNavLink href="/dividas" label="Buscar" icon={<SearchIcon className="size-5" />} />
        </div>
      </nav>
    </div>
  );
}

function BottomNavLink(props: { href: string; label: string; icon: ReactNode }) {
  return (
    <Suspense fallback={<NavLinkView {...props} active={false} />}>
      <NavLink {...props} />
    </Suspense>
  );
}
