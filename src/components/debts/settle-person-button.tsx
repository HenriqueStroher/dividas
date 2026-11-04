"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { settlePerson } from "@/app/(app)/dividas/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type SettlePersonButtonProps = {
  personId: string;
  personName: string;
  pendingCount: number;
};

export function SettlePersonButton({ personId, personName, pendingCount }: SettlePersonButtonProps) {
  const [pending, startTransition] = useTransition();

  function settle() {
    startTransition(async () => {
      const result = await settlePerson(personId);
      if (result.error) toast.error(result.error);
      else toast.success("Dívidas marcadas como pagas");
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" className="h-11" disabled={pending}>
          {pending ? "Marcando..." : "Marcar todas como pagas"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quitar tudo com {personName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingCount === 1
              ? "A dívida pendente será marcada como paga. Ela continua no histórico, e você pode desfazer o pagamento."
              : `As ${pendingCount} dívidas pendentes serão marcadas como pagas. Elas continuam no histórico, e você pode desfazer o pagamento de cada uma.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={settle}>Marcar como pagas</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
