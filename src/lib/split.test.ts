import { describe, expect, it } from "vitest";
import { buildDebtSplit, equalShareCents } from "./split";

describe("equalShareCents", () => {
  it("divide igualmente quando o valor é exato", () => {
    expect(equalShareCents(10000, 2)).toBe(5000);
  });

  it("arredonda dízimas para o centavo mais próximo", () => {
    expect(equalShareCents(10000, 3)).toBe(3333);
    expect(equalShareCents(20000, 3)).toBe(6667);
  });

  it("arredonda meio centavo para cima", () => {
    expect(equalShareCents(3, 2)).toBe(2);
  });

  it("fica a menos de meio centavo por parte do total", () => {
    for (let total = 1; total <= 500; total++) {
      for (let parts = 1; parts <= Math.min(total, 12); parts++) {
        const amount = equalShareCents(total, parts);
        expect(amount).toBeGreaterThanOrEqual(1);
        expect(Math.abs(amount * parts - total) * 2).toBeLessThanOrEqual(parts);
      }
    }
  });

  it("recusa divisões que deixariam alguém com R$ 0,00", () => {
    expect(() => equalShareCents(2, 3)).toThrow(RangeError);
  });

  it("recusa entradas inválidas", () => {
    expect(() => equalShareCents(0, 1)).toThrow(RangeError);
    expect(() => equalShareCents(100, 0)).toThrow(RangeError);
    expect(() => equalShareCents(10.5, 2)).toThrow(RangeError);
  });
});

describe("buildDebtSplit", () => {
  it("sem me incluir, a pessoa paga o valor total", () => {
    expect(buildDebtSplit(10000, ["paulo"], false)).toEqual({
      shares: [{ id: "paulo", amountCents: 10000 }],
      selfShareCents: 0,
    });
  });

  it("me incluindo, minha parte sai do que as pessoas devem", () => {
    expect(buildDebtSplit(10000, ["paulo"], true)).toEqual({
      shares: [{ id: "paulo", amountCents: 5000 }],
      selfShareCents: 5000,
    });
  });

  it("em uma dízima, ninguém paga um centavo a mais, nem eu", () => {
    expect(buildDebtSplit(10000, ["paulo", "joao"], true)).toEqual({
      shares: [
        { id: "paulo", amountCents: 3333 },
        { id: "joao", amountCents: 3333 },
      ],
      selfShareCents: 3333,
    });
  });

  it("me incluir conta como uma parte na checagem de valor mínimo", () => {
    expect(() => buildDebtSplit(1, ["paulo"], true)).toThrow(RangeError);
  });
});
