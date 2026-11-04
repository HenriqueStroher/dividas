import { z } from "zod";
import { MAX_CENTS } from "@/lib/money";

export const normalizeName = (name: string) => name.trim().toLowerCase();

const personSchema = z.object({
  /** null = pessoa nova, criada ao salvar. */
  id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Informe o nome").max(80, "Use até 80 caracteres"),
});

export const debtFormSchema = z
  .object({
    totalCents: z
      .number()
      .int()
      .positive("Informe o valor")
      .max(MAX_CENTS, "Valor acima do limite"),
    direction: z.enum(["i_owe", "owed_to_me"]),
    people: z.array(personSchema).min(1, "Selecione ao menos uma pessoa"),
    includeMe: z.boolean(),
    description: z.string().trim().min(1, "Informe a origem").max(200, "Use até 200 caracteres"),
    occurredOn: z.iso.date("Informe uma data válida"),
  })
  .superRefine((debt, ctx) => {
    const names = debt.people.map((person) => normalizeName(person.name));
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: "custom", path: ["people"], message: "Há pessoas repetidas na seleção" });
    }

    if (debt.includeMe && debt.direction === "i_owe") {
      ctx.addIssue({ code: "custom", path: ["includeMe"], message: "Só é possível se incluir em \"Me devem\"" });
    }

    const parts = debt.people.length + (debt.includeMe ? 1 : 0);
    if (debt.people.length > 0 && debt.totalCents > 0 && debt.totalCents < parts) {
      ctx.addIssue({
        code: "custom",
        path: ["totalCents"],
        message: "O valor não cobre ao menos R$ 0,01 para cada parte",
      });
    }
  });

export type DebtFormValues = z.input<typeof debtFormSchema>;
export type DebtInput = z.output<typeof debtFormSchema>;
