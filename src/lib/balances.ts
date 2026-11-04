type Direction = "i_owe" | "owed_to_me";

export type BalanceItem = {
  direction: Direction;
  amountCents: number;
  occurredOn: string;
};

/**
 * Totais do topo, a partir dos saldos líquidos por pessoa, para que o resumo
 * sempre bata com a lista: quem me deve 50 e a quem devo 20 entra como 30 a receber.
 */
export function summarizeBalances(balances: { netCents: number }[]) {
  let receivableCents = 0;
  let payableCents = 0;
  for (const { netCents } of balances) {
    if (netCents > 0) receivableCents += netCents;
    else payableCents -= netCents;
  }
  return { receivableCents, payableCents, netCents: receivableCents - payableCents };
}

const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** Valor curto para a composição do saldo: 3000 → "30"; 3334 → "33,34". */
export function formatShortAmount(cents: number): string {
  return cents % 100 === 0 ? whole.format(cents / 100) : decimal.format(cents / 100);
}

/**
 * Composição do saldo, só com os valores: "30 + 50 − 30".
 * O que a pessoa me deve vem antes do que eu devo a ela; dentro de cada grupo, por data.
 */
export function balanceAmounts(items: BalanceItem[]): string {
  const byDate = (a: BalanceItem, b: BalanceItem) => a.occurredOn.localeCompare(b.occurredOn);
  const ordered = [
    ...items.filter((item) => item.direction === "owed_to_me").sort(byDate),
    ...items.filter((item) => item.direction === "i_owe").sort(byDate),
  ];

  return ordered
    .map((item, i) => {
      const amount = formatShortAmount(item.amountCents);
      if (item.direction === "i_owe") return `− ${amount}`;
      return i === 0 ? amount : `+ ${amount}`;
    })
    .join(" ");
}

export function balanceNetCents(items: BalanceItem[]): number {
  return items.reduce(
    (sum, item) => sum + (item.direction === "owed_to_me" ? item.amountCents : -item.amountCents),
    0,
  );
}
