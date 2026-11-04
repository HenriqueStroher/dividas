"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteDebt, setDebtPaid } from "@/app/(app)/dividas/actions";
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

type DebtActionsProps = {
  debtId: string;
  description: string;
  shareCount: number;
  allPaid: boolean;
};

export function DebtActions({ debtId, description, shareCount, allPaid }: DebtActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else onSuccess?.();
    });
  }

  function handleDelete() {
    run(
      () => deleteDebt(debtId),
      () => {
        toast.success("Dívida excluída");
        router.push("/");
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {shareCount > 1 && (
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={pending}
          onClick={() => run(() => setDebtPaid(debtId, !allPaid))}
        >
          {allPaid ? "Marcar todas como pendentes" : "Marcar todas como pagas"}
        </Button>
      )}

      <Button asChild variant="outline" className="h-11">
        <Link href={`/dividas/${debtId}/editar`}>Editar</Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" className="h-11 text-destructive" disabled={pending}>
            Excluir
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &ldquo;{description}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {shareCount > 1
                ? `A dívida será removida para as ${shareCount} pessoas. Não é possível desfazer.`
                : "A dívida será removida. Não é possível desfazer."}
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
    </div>
  );
}
