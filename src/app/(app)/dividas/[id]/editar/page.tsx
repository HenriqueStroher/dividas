import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DebtForm } from "@/components/debts/debt-form";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { getDebt, getPeople } from "@/services/supabase/queries";
import { updateDebt } from "../../actions";

export const metadata: Metadata = { title: "Editar dívida" };

async function EditDebtForm({ params }: { params: PageProps<"/dividas/[id]/editar">["params"] }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [debt, people] = await Promise.all([getDebt(id), getPeople()]);
  if (!debt) notFound();

  const hasPaidShares = debt.shares.some((share) => share.paidAt !== null);

  return (
    <DebtForm
      people={people}
      submitLabel="Salvar alterações"
      redirectTo={`/dividas/${id}`}
      onSave={updateDebt.bind(null, id)}
      hint={
        hasPaidShares
          ? "Partes pagas continuam pagas se o valor delas não mudar. Se mudar, ou se o tipo da dívida mudar, voltam a pendente."
          : undefined
      }
      defaultValues={{
        totalCents: debt.totalCents,
        direction: debt.direction,
        people: debt.shares.map((share) => ({ id: share.personId, name: share.personName })),
        includeMe: debt.selfShareCents > 0,
        description: debt.description,
        occurredOn: debt.occurredOn,
      }}
    />
  );
}

export default function EditDebtPage({ params }: PageProps<"/dividas/[id]/editar">) {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Editar dívida</h1>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <EditDebtForm params={params} />
      </Suspense>
    </>
  );
}
