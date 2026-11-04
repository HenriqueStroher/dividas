import { describe, expect, it } from "vitest";
import { isNavLinkActive } from "./navigation";

describe("isNavLinkActive", () => {
  it("marca Saldos na tela principal e na página da pessoa", () => {
    expect(isNavLinkActive("/", "/")).toBe(true);
    expect(isNavLinkActive("/", "/pessoas/123")).toBe(true);
    expect(isNavLinkActive("/", "/dividas")).toBe(false);
  });

  it("marca Buscar somente na página de busca", () => {
    expect(isNavLinkActive("/dividas", "/dividas")).toBe(true);
    expect(isNavLinkActive("/dividas", "/")).toBe(false);
    expect(isNavLinkActive("/dividas", "/pessoas/123")).toBe(false);
  });

  it("não marca nenhuma aba em nova dívida nem na página de uma dívida", () => {
    for (const pathname of ["/dividas/nova", "/dividas/123", "/dividas/123/editar"]) {
      expect(isNavLinkActive("/", pathname)).toBe(false);
      expect(isNavLinkActive("/dividas", pathname)).toBe(false);
    }
  });
});
