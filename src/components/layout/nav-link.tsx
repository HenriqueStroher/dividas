"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isNavLinkActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = { href: string; label: string; icon: ReactNode };

/** Com Cache Components, usePathname suspende em rotas dinâmicas: use dentro de `<Suspense>`. */
export function NavLink(props: NavLinkProps) {
  const pathname = usePathname();
  return <NavLinkView {...props} active={isNavLinkActive(props.href, pathname)} />;
}

export function NavLinkView({ href, label, icon, active }: NavLinkProps & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 py-2 text-xs",
        active ? "font-semibold text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
          active && "bg-primary text-primary-foreground",
        )}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}
