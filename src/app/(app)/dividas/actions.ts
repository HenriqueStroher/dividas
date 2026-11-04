"use server";

import { revalidatePath } from "next/cache";
import { buildDebtSplit } from "@/lib/split";
import { debtFormSchema, type DebtFormValues, type DebtInput, normalizeName } from "@/lib/validations/debt";
import { createClient } from "@/services/supabase/server";

export type ActionResult = { error?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

const GENERIC_ERROR = "Não foi possível salvar. Tente novamente.";
const INVALID_FORM_ERROR = "Revise os campos do formulário.";

/** Devolve o id de cada pessoa da seleção, na mesma ordem, criando as que ainda não existem. */
async function resolvePersonIds(supabase: Supabase, people: DebtInput["people"]): Promise<string[]> {
  const newNames = people.filter((person) => !person.id).map((person) => person.name);
  if (newNames.length === 0) return people.map((person) => person.id!);

  // Reaproveita quem já existe com o mesmo nome. A consulta passa pelo RLS: só vê as pessoas do usuário.
  const { data: existing, error } = await supabase.from("people").select("id, name");
  if (error) throw error;
  const idByName = new Map(existing.map((person) => [normalizeName(person.name), person.id]));

  const missing = newNames.filter((name) => !idByName.has(normalizeName(name)));
  if (missing.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from("people")
      .insert(missing.map((name) => ({ name })))
      .select("id, name");
    if (insertError) throw insertError;
    created.forEach((person) => idByName.set(normalizeName(person.name), person.id));
  }

  return people.map((person) => person.id ?? idByName.get(normalizeName(person.name))!);
}

/** Monta os parâmetros comuns de create_debt e update_debt. */
async function prepareDebt(supabase: Supabase, debt: DebtInput) {
  const personIds = await resolvePersonIds(supabase, debt.people);
  const split = buildDebtSplit(debt.totalCents, personIds, debt.includeMe);

  return {
    p_direction: debt.direction,
    p_total_cents: debt.totalCents,
    p_self_share_cents: split.selfShareCents,
    p_description: debt.description,
    p_occurred_on: debt.occurredOn,
    p_shares: split.shares.map((share) => ({ person_id: share.id, amount_cents: share.amountCents })),
  };
}

export async function createDebt(values: DebtFormValues): Promise<ActionResult> {
  const parsed = debtFormSchema.safeParse(values);
  if (!parsed.success) return { error: INVALID_FORM_ERROR };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_debt", await prepareDebt(supabase, parsed.data));
    if (error) throw error;
  } catch (error) {
    console.error("createDebt", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function updateDebt(debtId: string, values: DebtFormValues): Promise<ActionResult> {
  const parsed = debtFormSchema.safeParse(values);
  if (!parsed.success) return { error: INVALID_FORM_ERROR };

  try {
    const supabase = await createClient();
    const params = await prepareDebt(supabase, parsed.data);
    const { error } = await supabase.rpc("update_debt", { p_debt_id: debtId, ...params });
    if (error) throw error;
  } catch (error) {
    console.error("updateDebt", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function deleteDebt(debtId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("debts").delete().eq("id", debtId);
  if (error) {
    console.error("deleteDebt", error);
    return { error: "Não foi possível excluir. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function setSharePaid(shareId: string, paid: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("debt_shares")
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq("id", shareId);
  if (error) {
    console.error("setSharePaid", error);
    return { error: "Não foi possível atualizar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return {};
}

/** Marca todas as partes da dívida. Partes já pagas mantêm a data original do pagamento. */
export async function setDebtPaid(debtId: string, paid: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const base = supabase.from("debt_shares");
  const { error } = paid
    ? await base.update({ paid_at: new Date().toISOString() }).eq("debt_id", debtId).is("paid_at", null)
    : await base.update({ paid_at: null }).eq("debt_id", debtId);
  if (error) {
    console.error("setDebtPaid", error);
    return { error: "Não foi possível atualizar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return {};
}
