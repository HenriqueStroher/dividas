"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { startRecoverySession } from "@/app/(auth)/actions";
import { buttonVariants } from "@/components/ui/button";
import { parseRecoveryHash } from "@/lib/recovery-link";

async function openLink(hash: string): Promise<boolean> {
  const tokens = parseRecoveryHash(hash);
  return tokens ? startRecoverySession(tokens) : false;
}

/** Destino do link de redefinição: abre a sessão com os tokens da URL e segue para a nova senha. */
export function RecoveryLinkHandler() {
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const { hash, pathname } = window.location;
    // Tira os tokens da barra de endereços e do histórico.
    window.history.replaceState(null, "", pathname);

    openLink(hash)
      .then((opened) => {
        if (opened) window.location.replace("/redefinir-senha");
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, []);

  if (!failed) {
    return (
      <p role="status" className="text-center text-sm text-muted-foreground">
        Abrindo o link...
      </p>
    );
  }

  return (
    <>
      <p role="alert" className="text-center text-sm">
        Este link não vale mais. Cada link funciona uma vez, e só o e-mail mais recente é válido.
      </p>
      <Link href="/esqueci-senha" className={buttonVariants({ className: "h-11" })}>
        Pedir um novo link
      </Link>
    </>
  );
}
