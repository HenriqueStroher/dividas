"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { type DebtFormValues, normalizeName } from "@/lib/validations/debt";
import type { Person } from "@/services/supabase/queries";

type SelectedPerson = DebtFormValues["people"][number];

type PeoplePickerProps = {
  people: Person[];
  value: SelectedPerson[];
  onChange: (value: SelectedPerson[]) => void;
};

/** A lista de pessoas só aparece com o campo de busca ativo; fora dele, só as selecionadas. */
export function PeoplePicker({ people, value, onChange }: PeoplePickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const query = normalizeName(search);

  useEffect(() => {
    function closeOnOutsidePress(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);

  const isSelected = (name: string) => value.some((person) => normalizeName(person.name) === normalizeName(name));

  function select(person: SelectedPerson) {
    if (!isSelected(person.name)) onChange([...value, person]);
    setSearch("");
  }

  function remove(person: SelectedPerson) {
    onChange(value.filter((item) => normalizeName(item.name) !== normalizeName(person.name)));
  }

  const options = people.filter((person) => !isSelected(person.name) && normalizeName(person.name).includes(query));
  const exactMatch = [...people, ...value].find((person) => normalizeName(person.name) === query);
  const canCreate = query !== "" && !exactMatch;

  function submitSearch() {
    if (query === "") return;
    select(exactMatch ?? { id: null, name: search.trim() });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <div ref={container} className="flex flex-col gap-3">
      <Input
        id="people-search"
        placeholder="Buscar ou criar pessoa"
        autoComplete="off"
        maxLength={80}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="h-11"
      />

      {open && (
        <div className="flex flex-wrap gap-2 rounded-lg border p-2">
          {options.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => select(person)}
              className="flex h-10 max-w-full items-center rounded-full border px-4 text-sm"
            >
              <span className="truncate">{person.name}</span>
            </button>
          ))}

          {canCreate && (
            <button
              type="button"
              onClick={submitSearch}
              className="flex h-10 max-w-full items-center gap-1 rounded-full border border-dashed px-4 text-sm"
            >
              <PlusIcon className="size-4 shrink-0" />
              <span className="truncate">Criar &ldquo;{search.trim()}&rdquo;</span>
            </button>
          )}

          {options.length === 0 && !canCreate && (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              {query === "" ? "Digite um nome para criar uma pessoa." : "Essa pessoa já está selecionada."}
            </p>
          )}
        </div>
      )}

      {value.length > 0 && (
        <ul aria-label="Pessoas selecionadas" className="flex flex-wrap gap-2">
          {value.map((person) => (
            <li key={person.id ?? person.name} className="max-w-full">
              <button
                type="button"
                aria-label={`Remover ${person.name}`}
                onClick={() => remove(person)}
                className="flex h-10 max-w-full items-center gap-1 rounded-full bg-primary pr-3 pl-4 text-sm text-primary-foreground"
              >
                <span className="truncate">{person.name}</span>
                <XIcon className="size-4 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
