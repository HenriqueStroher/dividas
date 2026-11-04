import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ShareDetail } from "@/services/supabase/queries";
import { PaidToggle } from "./paid-toggle";

type ShareRowProps = {
  share: ShareDetail;
  /** Mostra o nome da pessoa (na busca; no histórico da pessoa, é redundante). */
  showPerson?: boolean;
};

export function ShareRow({ share, showPerson = false }: ShareRowProps) {
  const paid = share.paidAt !== null;
  const iOwe = share.direction === "i_owe";

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3">
      <Link href={`/dividas/${share.debtId}`} className="flex items-start justify-between gap-4">
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium">{share.description}</span>
          <span className="truncate text-xs text-muted-foreground">
            {showPerson && `${share.personName} · `}
            {formatDate(share.occurredOn)}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "font-semibold tabular-nums",
              paid ? "text-muted-foreground" : iOwe ? "text-red-600" : "text-emerald-600",
            )}
          >
            {formatCents(share.amountCents)}
          </span>
          <span className="text-xs text-muted-foreground">{iOwe ? "eu devo" : "me deve"}</span>
          {share.amountCents !== share.totalCents && (
            <span className="text-xs text-muted-foreground tabular-nums">de {formatCents(share.totalCents)}</span>
          )}
        </span>
      </Link>

      <div className="flex items-center justify-between gap-2">
        <Badge variant={paid ? "secondary" : "outline"}>{paid ? "Paga" : "Pendente"}</Badge>
        <PaidToggle shareId={share.shareId} paid={paid} />
      </div>
    </li>
  );
}
