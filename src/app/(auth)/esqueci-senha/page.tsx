import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Enviar link"
        fields={[{ name: "email", label: "E-mail da sua conta", autoComplete: "email" }]}
      />
      <Link href="/login" className="text-center text-sm underline underline-offset-4">
        Voltar para o login
      </Link>
    </>
  );
}
