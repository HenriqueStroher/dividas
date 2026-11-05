import { z } from "zod";

const email = z.email("Informe um e-mail válido");
const newPassword = z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(72, "A senha pode ter até 72 caracteres");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha"),
});

export const signUpSchema = z.object({ email, password: newPassword });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password: newPassword });

export const recoveryTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
