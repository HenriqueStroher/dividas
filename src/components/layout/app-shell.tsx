import { LogOutIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
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
          <NavLink href="/" label="Saldos" icon={<UsersIcon className="size-5" />} />
          <Link
            href="/dividas/nova"
            aria-label="Nova dívida"
            className="mx-auto my-2 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <PlusIcon className="size-6" />
          </Link>
          <NavLink href="/dividas" label="Buscar" icon={<SearchIcon className="size-5" />} />
        </div>
      </nav>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-1 py-3 text-xs text-muted-foreground">
      {icon}
      {label}
    </Link>
  );
}
