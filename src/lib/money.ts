/** Teto de um lançamento: R$ 100 milhões. */
export const MAX_CENTS = 10_000_000_000;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

/**
 * Converte o texto do campo de valor em centavos, no estilo caixa eletrônico:
 * só os dígitos importam e os últimos dois são os centavos ("1234" → 1234 = R$ 12,34).
 */
export function digitsToCents(input: string): number {
  const digits = input.replace(/\D/g, "").slice(0, String(MAX_CENTS).length);
  return digits === "" ? 0 : Number(digits);
}
