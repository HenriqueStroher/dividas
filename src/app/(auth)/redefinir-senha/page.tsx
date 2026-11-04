import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { resetPassword } from "../actions";

export const metadata: Metadata = { title: "Nova senha" };

export default function ResetPasswordPage() {
  return (
    <AuthForm
      action={resetPassword}
      submitLabel="Salvar nova senha"
      fields={[{ name: "password", label: "Nova senha (mínimo de 8 caracteres)", autoComplete: "new-password" }]}
    />
  );
}
