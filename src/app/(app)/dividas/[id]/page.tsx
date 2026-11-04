import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DebtActions } from "@/components/debts/debt-actions";
import { PaidToggle } from "@/components/debts/paid-toggle";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { getDebt } from "@/services/supabase/queries";

export const metadata: Metadata = { title: "Dívida" };

async function DebtDetails({ params }: { params: PageProps<"/dividas/[id]">["params"] }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const debt = await getDebt(id);
  if (!debt) notFound();

  const iOwe = debt.direction === "i_owe";

  return (
    <>
      <section className="flex flex-col gap-1 rounded-xl border p-4">
        <h1 className="text-xl font-semibold tracking-tight break-words">{debt.description}</h1>
        <p className={`text-3xl font-semibold tracking-tight tabular-nums ${iOwe ? "text-red-600" : "text-emerald-600"}`}>
          {formatCents(debt.totalCents)}
        </p>
        <p className="text-sm text-muted-foreground">
          {iOwe ? "Eu devo" : "Me devem"} · {formatDate(debt.occurredOn)}
        </p>
      </section>

      <ul className="flex flex-col gap-2">
        {debt.shares.map((share) => (
          <li key={share.shareId} className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <Link href={`/pessoas/${share.personId}`} className="truncate font-medium underline-offset-4 hover:underline">
                {share.personName}
              </Link>
              <span className="shrink-0 font-semibold tabular-nums">{formatCents(share.amountCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Badge variant={share.paidAt ? "secondary" : "outline"}>{share.paidAt ? "Paga" : "Pendente"}</Badge>
              <PaidToggle shareId={share.shareId} paid={share.paidAt !== null} />
            </div>
          </li>
        ))}
        {debt.selfShareCents > 0 && (
          <li className="flex items-center justify-between gap-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <span>Sua parte (não vira dívida)</span>
            <span className="shrink-0 tabular-nums">{formatCents(debt.selfShareCents)}</span>
          </li>
        )}
      </ul>

      <DebtActions
        debtId={debt.id}
        description={debt.description}
        shareCount={debt.shares.length}
        allPaid={debt.shares.every((share) => share.paidAt !== null)}
      />
    </>
  );
}

export default function DebtPage({ params }: PageProps<"/dividas/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <DebtDetails params={params} />
    </Suspense>
  );
}
