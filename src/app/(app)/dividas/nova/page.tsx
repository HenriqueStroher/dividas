import type { Metadata } from "next";
import { Suspense } from "react";
import { DebtForm } from "@/components/debts/debt-form";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { todayIso } from "@/lib/dates";
import { getPeople } from "@/services/supabase/queries";
import { createDebt } from "../actions";

export const metadata: Metadata = { title: "Nova dívida" };

async function NewDebtForm() {
  const people = await getPeople();
  return (
    <DebtForm
      people={people}
      submitLabel="Salvar dívida"
      redirectTo="/"
      onSave={createDebt}
      defaultValues={{
        totalCents: 0,
        direction: "owed_to_me",
        people: [],
        includeMe: false,
        description: "",
        occurredOn: todayIso(),
      }}
    />
  );
}

export default function NewDebtPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Nova dívida</h1>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <NewDebtForm />
      </Suspense>
    </>
  );
}
