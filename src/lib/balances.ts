type Direction = "i_owe" | "owed_to_me";

export type FormulaItem = {
  direction: Direction;
  amountCents: number;
  description: string;
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
 * Composição do saldo de uma pessoa: "30 Restaurante + 50 Festa − 30 Uber".
 * O que ela me deve vem antes do que eu devo a ela; dentro de cada grupo, por data.
 */
export function balanceFormula(items: FormulaItem[]): { expression: string; netCents: number } {
  const byDate = (a: FormulaItem, b: FormulaItem) => a.occurredOn.localeCompare(b.occurredOn);
  const ordered = [
    ...items.filter((item) => item.direction === "owed_to_me").sort(byDate),
    ...items.filter((item) => item.direction === "i_owe").sort(byDate),
  ];

  const expression = ordered
    .map((item, i) => {
      const term = `${formatShortAmount(item.amountCents)} ${item.description}`;
      if (item.direction === "i_owe") return `− ${term}`;
      return i === 0 ? term : `+ ${term}`;
    })
    .join(" ");

  const netCents = items.reduce(
    (sum, item) => sum + (item.direction === "owed_to_me" ? item.amountCents : -item.amountCents),
    0,
  );

  return { expression, netCents };
}

export function balanceCaption(netCents: number): string {
  if (netCents > 0) return "valor que me deve";
  if (netCents < 0) return "valor que eu devo";
  return "ninguém deve nada";
}
