/**
 * Valor de cada parte em uma divisão igual. Quando não dá exato, arredonda para cima, e
 * todos pagam o mesmo: 10000 / 3 → 3334. Por isso, a soma das partes pode passar do total
 * em alguns centavos. Usa só aritmética de inteiros.
 */
export function equalShareCents(totalCents: number, parts: number): number {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new RangeError("O total precisa ser um inteiro positivo de centavos");
  }
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError("A divisão precisa de ao menos uma parte");
  }
  if (totalCents < parts) {
    throw new RangeError("O total não cobre um centavo para cada parte");
  }

  return Math.floor((totalCents + parts - 1) / parts);
}

export type DebtSplit<Id> = {
  shares: { id: Id; amountCents: number }[];
  /** Parte do próprio usuário (0 quando "me incluir" está desligado). Não vira dívida. */
  selfShareCents: number;
};

export function buildDebtSplit<Id>(
  totalCents: number,
  personIds: readonly Id[],
  includeMe: boolean,
): DebtSplit<Id> {
  const amountCents = equalShareCents(totalCents, personIds.length + (includeMe ? 1 : 0));
  return {
    shares: personIds.map((id) => ({ id, amountCents })),
    selfShareCents: includeMe ? amountCents : 0,
  };
}
