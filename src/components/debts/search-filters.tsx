"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Person, ShareFilters } from "@/services/supabase/queries";

const ALL = "todas";

export function SearchFilters({ people, filters }: { people: Person[]; filters: ShareFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [description, setDescription] = useState(filters.description ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(debounce.current), []);

  function navigate(next: ShareFilters) {
    const params = new URLSearchParams();
    if (next.personId) params.set("pessoa", next.personId);
    if (next.description) params.set("origem", next.description);
    if (next.status) params.set("status", next.status);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  function changeDescription(text: string) {
    setDescription(text);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => navigate({ ...filters, description: text.trim() || undefined }), 300);
  }

  function changeSelect(partial: ShareFilters) {
    clearTimeout(debounce.current);
    navigate({ ...filters, description: description.trim() || undefined, ...partial });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="origem">Origem</Label>
        <Input
          id="origem"
          type="search"
          placeholder="Ex: Festa"
          value={description}
          onChange={(event) => changeDescription(event.target.value)}
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="pessoa">Pessoa</Label>
          <Select
            value={filters.personId ?? ALL}
            onValueChange={(value) => changeSelect({ personId: value === ALL ? undefined : value })}
          >
            <SelectTrigger id="pessoa" className="w-full data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              changeSelect({ status: value === ALL ? undefined : (value as ShareFilters["status"]) })
            }
          >
            <SelectTrigger id="status" className="w-full data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="paga">Paga</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
