import { describe, expect, it } from "vitest";
import {
  balanceAmounts,
  balanceCaption,
  balanceFormula,
  formatShortAmount,
  type FormulaItem,
  summarizeBalances,
} from "./balances";

const item = (
  direction: FormulaItem["direction"],
  amountCents: number,
  description: string,
  occurredOn = "2026-11-04",
): FormulaItem => ({ direction, amountCents, description, occurredOn });

describe("summarizeBalances", () => {
  it("soma os saldos líquidos de cada pessoa", () => {
    expect(summarizeBalances([{ netCents: 3000 }, { netCents: -2000 }, { netCents: 500 }, { netCents: 0 }])).toEqual({
      receivableCents: 3500,
      payableCents: 2000,
      netCents: 1500,
    });
  });

  it("devolve zero sem pessoas", () => {
    expect(summarizeBalances([])).toEqual({ receivableCents: 0, payableCents: 0, netCents: 0 });
  });
});

describe("formatShortAmount", () => {
  it("omite os centavos de valores inteiros", () => {
    expect(formatShortAmount(3000)).toBe("30");
    expect(formatShortAmount(123400)).toBe("1.234");
  });

  it("mostra os centavos quando existem", () => {
    expect(formatShortAmount(3334)).toBe("33,34");
    expect(formatShortAmount(3350)).toBe("33,50");
  });
});

describe("balanceFormula", () => {
  it("reproduz o exemplo pedido: 30 + 50 + 20 − 30 = 70", () => {
    const result = balanceFormula([
      item("owed_to_me", 3000, "Restaurante", "2026-11-01"),
      item("i_owe", 3000, "Uber", "2026-11-02"),
      item("owed_to_me", 5000, "Festa", "2026-11-03"),
      item("owed_to_me", 2000, "Bebida", "2026-11-04"),
    ]);
    expect(result.expression).toBe("30 Restaurante + 50 Festa + 20 Bebida − 30 Uber");
    expect(result.netCents).toBe(7000);
  });

  it("ordena por data dentro de cada grupo", () => {
    const { expression } = balanceFormula([
      item("owed_to_me", 200, "Depois", "2026-11-04"),
      item("owed_to_me", 100, "Antes", "2026-11-01"),
    ]);
    expect(expression).toBe("1 Antes + 2 Depois");
  });

  it("começa com o sinal de menos quando só eu devo", () => {
    const result = balanceFormula([item("i_owe", 3000, "Uber"), item("i_owe", 2000, "Bar")]);
    expect(result.expression).toBe("− 30 Uber − 20 Bar");
    expect(result.netCents).toBe(-5000);
  });

  it("fica vazia sem itens", () => {
    expect(balanceFormula([])).toEqual({ expression: "", netCents: 0 });
  });
});

describe("balanceAmounts", () => {
  it("mostra só os valores, sem as origens", () => {
    expect(
      balanceAmounts([
        item("owed_to_me", 10000, "A", "2026-11-01"),
        item("i_owe", 3000, "Uber", "2026-11-02"),
        item("owed_to_me", 3333, "P", "2026-11-03"),
      ]),
    ).toBe("100 + 33,33 − 30");
  });
});

describe("balanceCaption", () => {
  it("descreve quem deve", () => {
    expect(balanceCaption(1)).toBe("valor que me deve");
    expect(balanceCaption(-1)).toBe("valor que eu devo");
    expect(balanceCaption(0)).toBe("ninguém deve nada");
  });
});
