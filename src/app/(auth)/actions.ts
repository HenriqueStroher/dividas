"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RECOVERY_LINK_PATH, type RecoveryTokens } from "@/lib/recovery-link";
import {
  forgotPasswordSchema,
  recoveryTokensSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validations/auth";
import { createClient, createPasswordRecoveryClient } from "@/services/supabase/server";

export type AuthFormState = { error?: string; message?: string };

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  email_exists: "Já existe uma conta com este e-mail.",
  weak_password: "Essa senha é muito fraca. Escolha uma senha mais forte.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit: "Limite de e-mails atingido. Aguarde até 1 hora e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
};

function authErrorMessage(error: AuthError): string {
  return (error.code && AUTH_ERRORS[error.code]) || "Não foi possível concluir. Tente novamente.";
}

/** URL para onde o link do e-mail volta. Usa a origem atual para valer em local e em produção. */
async function emailRedirectUrl(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}${path}`;
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
    options: { emailRedirectTo: await emailRedirectUrl("/auth/confirm?next=%2F") },
  });
  if (error) return { error: authErrorMessage(error) };

  // Sem sessão significa que a confirmação de e-mail está ativa.
  if (data.session) redirect("/");
  return { message: "Enviamos um link de confirmação para o seu e-mail." };
}

export async function requestPasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await createPasswordRecoveryClient().auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: await emailRedirectUrl(RECOVERY_LINK_PATH),
  });
  if (error) return { error: authErrorMessage(error) };

  // O Supabase responde igual exista ou não a conta, e o texto não revela quem está cadastrado.
  return {
    message:
      "Pedido enviado. Se houver uma conta com este e-mail, o link chega em instantes. Veja também o spam e use sempre o e-mail mais recente.",
  };
}

/** Abre a sessão a partir dos tokens do link de redefinição, gravando-a nos cookies. */
export async function startRecoverySession(tokens: RecoveryTokens): Promise<boolean> {
  const parsed = recoveryTokensSchema.safeParse(tokens);
  if (!parsed.success) return false;

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: parsed.data.accessToken,
    refresh_token: parsed.data.refreshToken,
  });
  return !error;
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
