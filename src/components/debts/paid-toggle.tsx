"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setSharePaid } from "@/app/(app)/dividas/actions";
import { Button } from "@/components/ui/button";

export function PaidToggle({ shareId, paid }: { shareId: string; paid: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setSharePaid(shareId, !paid);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <Button type="button" variant={paid ? "ghost" : "outline"} size="sm" disabled={pending} onClick={toggle}>
      {paid ? "Desfazer pagamento" : "Marcar como paga"}
    </Button>
  );
}
