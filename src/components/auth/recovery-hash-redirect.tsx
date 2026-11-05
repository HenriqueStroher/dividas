"use client";

import { useEffect } from "react";
import { parseRecoveryHash, RECOVERY_LINK_PATH } from "@/lib/recovery-link";

/**
 * Leva para a tela de redefinição os links que voltam para outra página. Acontece com o envio pelo
 * painel do Supabase e quando a URL de retorno não está na lista permitida: nos dois casos, o
 * Supabase usa a Site URL, e o proxy manda para o login, mantendo os tokens depois do `#`.
 */
export function RecoveryHashRedirect() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (pathname !== RECOVERY_LINK_PATH && parseRecoveryHash(hash)) {
      window.location.replace(`${RECOVERY_LINK_PATH}${hash}`);
    }
  }, []);

  return null;
}
