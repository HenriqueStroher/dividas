"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deletePerson } from "@/app/(app)/pessoas/actions";
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

type DeletePersonButtonProps = {
  personId: string;
  personName: string;
  pendingCount: number;
  historyCount: number;
};

export function DeletePersonButton({ personId, personName, pendingCount, historyCount }: DeletePersonButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePerson(personId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pessoa excluída");
      router.push("/");
    });
  }

  if (pendingCount > 0) {
    return (
      <div className="flex flex-col gap-1">
        <Button type="button" variant="ghost" className="h-11 text-destructive" disabled>
          Excluir pessoa
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Para excluir, marque como pagas ou exclua as dívidas pendentes.
        </p>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="h-11 text-destructive" disabled={pending}>
          {pending ? "Excluindo..." : "Excluir pessoa"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {personName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {historyCount === 0
              ? "A pessoa será removida. Não é possível desfazer."
              : `${historyCount === 1 ? "O registro do histórico" : `Os ${historyCount} registros do histórico`} com esta pessoa também ${historyCount === 1 ? "será apagado" : "serão apagados"}. Em dívidas divididas, as outras pessoas continuam com o mesmo valor. Não é possível desfazer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
