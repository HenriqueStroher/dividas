import type { Database } from "@/types/database";
import { createClient } from "./server";

export type DebtDirection = Database["public"]["Enums"]["debt_direction"];

export type Person = { id: string; name: string };

export type PersonBalance = {
  personId: string;
  name: string;
  receivableCents: number;
  payableCents: number;
  netCents: number;
};

export type ShareDetail = {
  shareId: string;
  debtId: string;
  personId: string;
  personName: string;
  direction: DebtDirection;
  amountCents: number;
  totalCents: number;
  selfShareCents: number;
  description: string;
  occurredOn: string;
  paidAt: string | null;
};

export type DebtWithShares = {
  id: string;
  direction: DebtDirection;
  totalCents: number;
  selfShareCents: number;
  description: string;
  occurredOn: string;
  shares: { shareId: string; personId: string; personName: string; amountCents: number; paidAt: string | null }[];
};

export type ShareStatusFilter = "pendente" | "paga";

export type ShareFilters = {
  personId?: string;
  description?: string;
  status?: ShareStatusFilter;
};

export const SEARCH_LIMIT = 200;

type ShareRow = Database["public"]["Views"]["debt_share_details"]["Row"];

// As colunas de views chegam como anuláveis nos tipos, mas nestas nunca há null.
function toShareDetail(row: ShareRow): ShareDetail {
  return {
    shareId: row.share_id!,
    debtId: row.debt_id!,
    personId: row.person_id!,
    personName: row.person_name!,
    direction: row.direction!,
    amountCents: row.amount_cents!,
    totalCents: row.total_cents!,
    selfShareCents: row.self_share_cents!,
    description: row.description!,
    occurredOn: row.occurred_on!,
    paidAt: row.paid_at,
  };
}

/** Escapa os curingas do ILIKE para que "%" e "_" sejam buscados literalmente. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function getPeople(): Promise<Person[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("people").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export async function getBalances(): Promise<PersonBalance[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("person_balances").select("*");
  if (error) throw error;
  return data.map((row) => ({
    personId: row.person_id!,
    name: row.name!,
    receivableCents: row.receivable_cents!,
    payableCents: row.payable_cents!,
    netCents: row.net_cents!,
  }));
}

export async function getPerson(personId: string): Promise<Person | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("people").select("id, name").eq("id", personId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Partes em ordem cronológica, da mais recente para a mais antiga. */
export async function getShares(filters: ShareFilters = {}, limit?: number): Promise<ShareDetail[]> {
  const supabase = await createClient();
  let query = supabase
    .from("debt_share_details")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.personId) query = query.eq("person_id", filters.personId);
  if (filters.description) query = query.ilike("description", `%${escapeLike(filters.description)}%`);
  if (filters.status === "pendente") query = query.is("paid_at", null);
  if (filters.status === "paga") query = query.not("paid_at", "is", null);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(toShareDetail);
}

export async function getDebt(debtId: string): Promise<DebtWithShares | null> {
  const supabase = await createClient();
  const { data: debt, error } = await supabase
    .from("debts")
    .select("id, direction, total_cents, self_share_cents, description, occurred_on")
    .eq("id", debtId)
    .maybeSingle();
  if (error) throw error;
  if (!debt) return null;

  const [{ data: shares, error: sharesError }, { data: people, error: peopleError }] = await Promise.all([
    supabase
      .from("debt_shares")
      .select("id, person_id, amount_cents, paid_at, position")
      .eq("debt_id", debtId)
      .order("position"),
    supabase.from("people").select("id, name"),
  ]);
  if (sharesError) throw sharesError;
  if (peopleError) throw peopleError;

  const names = new Map(people.map((person) => [person.id, person.name]));
  return {
    id: debt.id,
    direction: debt.direction,
    totalCents: debt.total_cents,
    selfShareCents: debt.self_share_cents,
    description: debt.description,
    occurredOn: debt.occurred_on,
    shares: shares.map((share) => ({
      shareId: share.id,
      personId: share.person_id,
      personName: names.get(share.person_id) ?? "",
      amountCents: share.amount_cents,
      paidAt: share.paid_at,
    })),
  };
}
