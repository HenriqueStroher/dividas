import { describe, expect, it } from "vitest";
import { digitsToCents, formatCents } from "./money";

// O Intl separa "R$" do valor com espaço não separável.
const normalize = (text: string) => text.replace(/ /g, " ");

describe("formatCents", () => {
  it("formata em reais", () => {
    expect(normalize(formatCents(3334))).toBe("R$ 33,34");
    expect(normalize(formatCents(123456))).toBe("R$ 1.234,56");
    expect(normalize(formatCents(5))).toBe("R$ 0,05");
  });

  it("formata valores negativos", () => {
    expect(normalize(formatCents(-3000))).toBe("-R$ 30,00");
  });
});

describe("digitsToCents", () => {
  it("trata os dois últimos dígitos como centavos", () => {
    expect(digitsToCents("1234")).toBe(1234);
    expect(digitsToCents("5")).toBe(5);
  });

  it("ignora a formatação existente no campo", () => {
    expect(digitsToCents("R$ 1.234,567")).toBe(1234567);
  });

  it("devolve zero sem dígitos", () => {
    expect(digitsToCents("")).toBe(0);
    expect(digitsToCents("abc")).toBe(0);
  });

  it("não aceita números além do limite de dígitos", () => {
    expect(digitsToCents("9".repeat(30))).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});
