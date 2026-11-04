import Link from "next/link";
import { Suspense } from "react";
import { BalanceSummary } from "@/components/balances/balance-summary";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { AddPerson } from "@/components/people/add-person";
import { Button } from "@/components/ui/button";
import { balanceAmounts, summarizeBalances } from "@/lib/balances";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getBalances, getShares, type PersonBalance } from "@/services/supabase/queries";

async function Balances() {
  const [balances, pending] = await Promise.all([getBalances(), getShares({ status: "pendente" })]);

  if (balances.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">Nenhuma dívida por aqui ainda.</p>
        <Button asChild className="h-11">
          <Link href="/dividas/nova">Cadastrar a primeira</Link>
        </Button>
        <div className="flex w-full flex-col">
          <AddPerson />
        </div>
      </div>
    );
  }

  const open = balances
    .filter((balance) => balance.netCents !== 0)
    .sort((a, b) => Math.abs(b.netCents) - Math.abs(a.netCents));
  const settled = balances
    .filter((balance) => balance.netCents === 0)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const amountsFor = (personId: string) => balanceAmounts(pending.filter((share) => share.personId === personId));

  return (
    <>
      <BalanceSummary {...summarizeBalances(balances)} />
      <AddPerson />

      {open.length > 0 && (
        <ul className="flex flex-col gap-2">
          {open.map((balance) => (
            <PersonRow key={balance.personId} balance={balance} amounts={amountsFor(balance.personId)} />
          ))}
        </ul>
      )}

      {settled.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Em dia</h2>
          <ul className="flex flex-col gap-2">
            {settled.map((balance) => (
              <PersonRow key={balance.personId} balance={balance} amounts={amountsFor(balance.personId)} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function PersonRow({ balance, amounts }: { balance: PersonBalance; amounts: string }) {
  const { netCents } = balance;
  return (
    <li>
      <Link href={`/pessoas/${balance.personId}`} className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{balance.name}</span>
          {amounts && <span className="line-clamp-2 text-xs text-muted-foreground tabular-nums">{amounts}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "font-semibold tabular-nums",
              netCents > 0 && "text-emerald-600",
              netCents < 0 && "text-red-600",
              netCents === 0 && "text-muted-foreground",
            )}
          >
            {formatCents(Math.abs(netCents))}
          </span>
          {netCents !== 0 && (
            <span className="text-xs text-muted-foreground">{netCents > 0 ? "Me deve" : "Eu devo"}</span>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">Saldos</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Balances />
      </Suspense>
    </>
  );
}
