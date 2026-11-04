import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Entrar" };

async function LinkError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { erro } = await searchParams;
  if (erro !== "link-invalido") return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      Este link é inválido ou expirou. Peça um novo.
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <Suspense>
        <LinkError searchParams={searchParams} />
      </Suspense>
      <AuthForm
        action={signIn}
        submitLabel="Entrar"
        fields={[
          { name: "email", label: "E-mail", autoComplete: "email" },
          { name: "password", label: "Senha", autoComplete: "current-password" },
        ]}
      />
      <div className="flex flex-col gap-2 text-center text-sm">
        <Link href="/esqueci-senha" className="text-muted-foreground underline underline-offset-4">
          Esqueci minha senha
        </Link>
        <Link href="/cadastro" className="underline underline-offset-4">
          Criar conta
        </Link>
      </div>
    </>
  );
}
