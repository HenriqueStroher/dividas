import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SettlePersonButton } from "@/components/debts/settle-person-button";
import { ShareRow } from "@/components/debts/share-row";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { balanceAmounts, balanceNetCents, formatShortAmount } from "@/lib/balances";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getPerson, getShares } from "@/services/supabase/queries";

export const metadata: Metadata = { title: "Histórico" };

async function PersonHistory({ params }: { params: PageProps<"/pessoas/[id]">["params"] }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [person, shares] = await Promise.all([getPerson(id), getShares({ personId: id })]);
  if (!person) notFound();

  const pending = shares.filter((share) => share.paidAt === null);
  const amounts = balanceAmounts(pending);
  const netCents = balanceNetCents(pending);

  return (
    <>
      <section className="flex flex-col gap-2 rounded-xl border p-4">
        <h1 className="truncate text-xl font-semibold tracking-tight">{person.name}</h1>
        <p
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            netCents > 0 && "text-emerald-600",
            netCents < 0 && "text-red-600",
          )}
        >
          {formatCents(Math.abs(netCents))}
        </p>
        <p className="text-sm text-muted-foreground">Valor total</p>
        {pending.length > 1 && (
          <p className="border-t pt-2 text-sm tabular-nums">
            {amounts} = {netCents < 0 && "− "}
            {formatShortAmount(Math.abs(netCents))}
          </p>
        )}
        {pending.length > 0 && (
          <SettlePersonButton personId={person.id} personName={person.name} pendingCount={pending.length} />
        )}
      </section>

      <h2 className="text-sm font-medium text-muted-foreground">Histórico</h2>
      {shares.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma dívida com esta pessoa.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shares.map((share) => (
            <ShareRow key={share.shareId} share={share} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function PersonPage({ params }: PageProps<"/pessoas/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <PersonHistory params={params} />
    </Suspense>
  );
}
