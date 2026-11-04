"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/app/(app)/dividas/actions";
import { personNameSchema } from "@/lib/validations/debt";
import { createClient } from "@/services/supabase/server";

const UNIQUE_VIOLATION = "23505";
/** Definido em `delete_person`: a pessoa ainda tem partes pendentes. */
const HAS_PENDING_SHARES = "DV001";

export async function createPerson(name: string): Promise<ActionResult> {
  const parsed = personNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("people").insert({ name: parsed.data });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { error: "Já existe uma pessoa com esse nome." };
    console.error("createPerson", error);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function deletePerson(personId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_person", { p_person_id: personId });
  if (error) {
    if (error.code === HAS_PENDING_SHARES) return { error: "Esta pessoa ainda tem dívidas pendentes." };
    console.error("deletePerson", error);
    return { error: "Não foi possível excluir. Tente novamente." };
  }

  revalidatePath("/", "layout");
  return {};
}
