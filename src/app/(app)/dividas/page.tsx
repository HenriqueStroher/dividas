import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { SearchFilters } from "@/components/debts/search-filters";
import { ShareRow } from "@/components/debts/share-row";
import { ListSkeleton } from "@/components/layout/list-skeleton";
import { getPeople, getShares, SEARCH_LIMIT, type ShareFilters } from "@/services/supabase/queries";

export const metadata: Metadata = { title: "Buscar" };

// Parâmetros inválidos na URL são ignorados, em vez de virarem erro no banco.
const searchParamsSchema = z.object({
  pessoa: z.uuid().optional().catch(undefined),
  origem: z.string().trim().max(200).optional().catch(undefined),
  status: z.enum(["pendente", "paga"]).optional().catch(undefined),
});

async function Results({ filters }: { filters: ShareFilters }) {
  const shares = await getShares(filters, SEARCH_LIMIT);

  if (shares.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma dívida encontrada.</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {shares.map((share) => (
          <ShareRow key={share.shareId} share={share} showPerson />
        ))}
      </ul>
      {shares.length === SEARCH_LIMIT && (
        <p className="text-center text-xs text-muted-foreground">
          Mostrando as {SEARCH_LIMIT} mais recentes. Refine os filtros para ver as demais.
        </p>
      )}
    </>
  );
}

async function Search({ searchParams }: { searchParams: PageProps<"/dividas">["searchParams"] }) {
  const { pessoa, origem, status } = searchParamsSchema.parse(await searchParams);
  const filters: ShareFilters = { personId: pessoa, description: origem || undefined, status };
  const people = await getPeople();

  return (
    <>
      <SearchFilters people={people} filters={filters} />
      <Suspense key={JSON.stringify(filters)} fallback={<ListSkeleton />}>
        <Results filters={filters} />
      </Suspense>
    </>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/dividas">) {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Buscar</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Search searchParams={searchParams} />
      </Suspense>
    </>
  );
}
