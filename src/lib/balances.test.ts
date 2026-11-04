import { describe, expect, it } from "vitest";
import {
  balanceAmounts,
  type BalanceItem,
  balanceNetCents,
  formatShortAmount,
  summarizeBalances,
} from "./balances";

const item = (direction: BalanceItem["direction"], amountCents: number, occurredOn = "2026-11-04"): BalanceItem => ({
  direction,
  amountCents,
  occurredOn,
});

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

describe("balanceAmounts", () => {
  it("lista primeiro o que me devem e depois o que eu devo: 30 + 50 + 20 − 30", () => {
    expect(
      balanceAmounts([
        item("owed_to_me", 3000, "2026-11-01"),
        item("i_owe", 3000, "2026-11-02"),
        item("owed_to_me", 5000, "2026-11-03"),
        item("owed_to_me", 2000, "2026-11-04"),
      ]),
    ).toBe("30 + 50 + 20 − 30");
  });

  it("ordena por data dentro de cada grupo", () => {
    expect(balanceAmounts([item("owed_to_me", 200, "2026-11-04"), item("owed_to_me", 100, "2026-11-01")])).toBe(
      "1 + 2",
    );
  });

  it("começa com o sinal de menos quando só eu devo", () => {
    expect(balanceAmounts([item("i_owe", 3000), item("i_owe", 2000)])).toBe("− 30 − 20");
  });

  it("mostra centavos e fica vazia sem itens", () => {
    expect(balanceAmounts([item("owed_to_me", 3333)])).toBe("33,33");
    expect(balanceAmounts([])).toBe("");
  });
});

describe("balanceNetCents", () => {
  it("subtrai o que eu devo do que me devem", () => {
    expect(
      balanceNetCents([
        item("owed_to_me", 3000),
        item("owed_to_me", 5000),
        item("owed_to_me", 2000),
        item("i_owe", 3000),
      ]),
    ).toBe(7000);
    expect(balanceNetCents([item("i_owe", 5000)])).toBe(-5000);
    expect(balanceNetCents([])).toBe(0);
  });
});
