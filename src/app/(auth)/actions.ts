"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import { createClient } from "@/services/supabase/server";

export type AuthFormState = { error?: string; message?: string };

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  email_exists: "Já existe uma conta com este e-mail.",
  weak_password: "Essa senha é muito fraca. Escolha uma senha mais forte.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit: "Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
};

function authErrorMessage(error: AuthError): string {
  return (error.code && AUTH_ERRORS[error.code]) || "Não foi possível concluir. Tente novamente.";
}

/** URL para onde o link do e-mail volta. Usa a origem atual para valer em local e em produção. */
async function emailRedirectUrl(next: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signIn(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error) };

  redirect("/");
}

export async function signUp(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: await emailRedirectUrl("/") },
  });
  if (error) return { error: authErrorMessage(error) };

  // Sem sessão significa que a confirmação de e-mail está ativa.
  if (data.session) redirect("/");
  return { message: "Enviamos um link de confirmação para o seu e-mail." };
}

export async function requestPasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: await emailRedirectUrl("/redefinir-senha"),
  });
  if (error?.code === "over_email_send_rate_limit") return { error: authErrorMessage(error) };

  // A resposta é a mesma exista ou não a conta, para não revelar quem está cadastrado.
  return { message: "Se houver uma conta com este e-mail, enviaremos um link para redefinir a senha." };
}

export async function resetPassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error) };

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
