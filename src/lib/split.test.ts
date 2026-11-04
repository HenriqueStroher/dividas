import { describe, expect, it } from "vitest";
import { buildDebtSplit, equalShareCents } from "./split";

describe("equalShareCents", () => {
  it("divide igualmente quando o valor é exato", () => {
    expect(equalShareCents(10000, 2)).toBe(5000);
  });

  it("arredonda para cima quando não dá exato", () => {
    expect(equalShareCents(10000, 3)).toBe(3334);
    expect(equalShareCents(20000, 3)).toBe(6667);
    expect(equalShareCents(3, 2)).toBe(2);
  });

  it("cobre o total e passa dele por menos de um centavo por parte", () => {
    for (let total = 1; total <= 500; total++) {
      for (let parts = 1; parts <= Math.min(total, 12); parts++) {
        const excess = equalShareCents(total, parts) * parts - total;
        expect(excess).toBeGreaterThanOrEqual(0);
        expect(excess).toBeLessThan(parts);
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

  it("em uma dízima, todos pagam o mesmo valor arredondado para cima, inclusive eu", () => {
    expect(buildDebtSplit(10000, ["paulo", "joao"], true)).toEqual({
      shares: [
        { id: "paulo", amountCents: 3334 },
        { id: "joao", amountCents: 3334 },
      ],
      selfShareCents: 3334,
    });
  });

  it("me incluir conta como uma parte na checagem de valor mínimo", () => {
    expect(() => buildDebtSplit(1, ["paulo"], true)).toThrow(RangeError);
  });
});
