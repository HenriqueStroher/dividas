export const RECOVERY_LINK_PATH = "/auth/recuperar";

export type RecoveryTokens = { accessToken: string; refreshToken: string };

/** Lê os tokens que o Supabase coloca depois do `#` no link de redefinição de senha. */
export function parseRecoveryHash(hash: string): RecoveryTokens | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (params.get("type") !== "recovery" || !accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
