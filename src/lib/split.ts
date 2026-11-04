/**
 * Divide um total em partes iguais. Os centavos que sobram vão, um a um,
 * para as primeiras partes: 10000 / 3 → [3334, 3333, 3333].
 */
export function splitCents(totalCents: number, parts: number): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new RangeError("O total precisa ser um inteiro positivo de centavos");
  }
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError("A divisão precisa de ao menos uma parte");
  }
  if (totalCents < parts) {
    throw new RangeError("O total não cobre um centavo para cada parte");
  }

  const base = Math.floor(totalCents / parts);
  const remainder = totalCents % parts;
  return Array.from({ length: parts }, (_, i) => (i < remainder ? base + 1 : base));
}

export type DebtSplit<Id> = {
  shares: { id: Id; amountCents: number }[];
  /** Parte do próprio usuário (0 quando "me incluir" está desligado). Não vira dívida. */
  selfShareCents: number;
};

/**
 * Monta a divisão de uma dívida. O usuário, quando incluído, fica por último:
 * os centavos que sobram vão primeiro para as pessoas selecionadas.
 */
export function buildDebtSplit<Id>(
  totalCents: number,
  personIds: readonly Id[],
  includeMe: boolean,
): DebtSplit<Id> {
  const amounts = splitCents(totalCents, personIds.length + (includeMe ? 1 : 0));
  return {
    shares: personIds.map((id, i) => ({ id, amountCents: amounts[i] })),
    selfShareCents: includeMe ? amounts[personIds.length] : 0,
  };
}
