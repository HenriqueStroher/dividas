import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <>
      <AuthForm
        action={signUp}
        submitLabel="Criar conta"
        fields={[
          { name: "email", label: "E-mail", autoComplete: "email" },
          { name: "password", label: "Senha (mínimo de 8 caracteres)", autoComplete: "new-password" },
        ]}
      />
      <Link href="/login" className="text-center text-sm underline underline-offset-4">
        Já tenho conta
      </Link>
    </>
  );
}
