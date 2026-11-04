import { describe, expect, it } from "vitest";
import { buildDebtSplit, splitCents } from "./split";

describe("splitCents", () => {
  it("divide igualmente quando o valor é exato", () => {
    expect(splitCents(10000, 2)).toEqual([5000, 5000]);
  });

  it("dá os centavos que sobram às primeiras partes", () => {
    expect(splitCents(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitCents(10001, 3)).toEqual([3334, 3334, 3333]);
  });

  it("sempre soma o total", () => {
    for (let total = 1; total <= 500; total++) {
      for (let parts = 1; parts <= Math.min(total, 12); parts++) {
        const amounts = splitCents(total, parts);
        expect(amounts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("recusa divisões que deixariam alguém com R$ 0,00", () => {
    expect(() => splitCents(2, 3)).toThrow(RangeError);
  });

  it("recusa entradas inválidas", () => {
    expect(() => splitCents(0, 1)).toThrow(RangeError);
    expect(() => splitCents(100, 0)).toThrow(RangeError);
    expect(() => splitCents(10.5, 2)).toThrow(RangeError);
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

  it("os centavos que sobram vão para as pessoas antes de mim", () => {
    expect(buildDebtSplit(10000, ["paulo", "joao"], true)).toEqual({
      shares: [
        { id: "paulo", amountCents: 3334 },
        { id: "joao", amountCents: 3333 },
      ],
      selfShareCents: 3333,
    });
  });

  it("me incluir conta como uma parte na checagem de valor mínimo", () => {
    expect(() => buildDebtSplit(1, ["paulo"], true)).toThrow(RangeError);
  });
});
