import { describe, expect, it } from "vitest";
import { debtFormSchema } from "./debt";

const valid = {
  totalCents: 10000,
  direction: "owed_to_me",
  people: [{ id: null, name: "Paulo" }],
  includeMe: false,
  description: "Festa praia",
  occurredOn: "2026-11-04",
};

const firstError = (input: object) => {
  const result = debtFormSchema.safeParse({ ...valid, ...input });
  return result.success ? null : result.error.issues[0].message;
};

describe("debtFormSchema", () => {
  it("aceita uma dívida válida e limpa os espaços", () => {
    const parsed = debtFormSchema.parse({ ...valid, description: "  Festa  " });
    expect(parsed.description).toBe("Festa");
  });

  it("exige valor, pessoas e origem", () => {
    expect(firstError({ totalCents: 0 })).toBe("Informe o valor");
    expect(firstError({ people: [] })).toBe("Selecione ao menos uma pessoa");
    expect(firstError({ description: "   " })).toBe("Informe a origem");
  });

  it("recusa datas inválidas", () => {
    expect(firstError({ occurredOn: "2026-13-40" })).toBe("Informe uma data válida");
  });

  it("recusa pessoas repetidas, ignorando maiúsculas e espaços", () => {
    expect(
      firstError({
        people: [
          { id: null, name: "Paulo" },
          { id: null, name: " paulo " },
        ],
      }),
    ).toBe("Há pessoas repetidas na seleção");
  });

  it("recusa valor que deixaria alguém com R$ 0,00, contando o próprio usuário", () => {
    const message = "O valor não cobre ao menos R$ 0,01 para cada parte";
    expect(firstError({ totalCents: 1, includeMe: true })).toBe(message);
    expect(firstError({ totalCents: 1, includeMe: false })).toBeNull();
  });
});
