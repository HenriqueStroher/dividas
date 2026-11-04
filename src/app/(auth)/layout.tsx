import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <div className="text-center">
        <p className="text-2xl font-semibold tracking-tight">Dívidas</p>
        <p className="text-sm text-muted-foreground">Quem deve o quê, sem confusão.</p>
      </div>
      {children}
    </main>
  );
}
