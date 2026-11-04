import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type BalanceSummaryProps = {
  receivableCents: number;
  payableCents: number;
  netCents: number;
};

export function BalanceSummary({ receivableCents, payableCents, netCents }: BalanceSummaryProps) {
  return (
    <section aria-label="Resumo" className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Saldo geral</span>
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            netCents > 0 && "text-emerald-600",
            netCents < 0 && "text-red-600",
          )}
        >
          {formatCents(netCents)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t pt-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Me devem</span>
          <span className="font-medium text-emerald-600 tabular-nums">{formatCents(receivableCents)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Eu devo</span>
          <span className="font-medium text-red-600 tabular-nums">{formatCents(payableCents)}</span>
        </div>
      </div>
    </section>
  );
}
