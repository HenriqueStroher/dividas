"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type DebtFormValues, normalizeName } from "@/lib/validations/debt";
import type { Person } from "@/services/supabase/queries";

type SelectedPerson = DebtFormValues["people"][number];

type PeoplePickerProps = {
  people: Person[];
  value: SelectedPerson[];
  onChange: (value: SelectedPerson[]) => void;
};

export function PeoplePicker({ people, value, onChange }: PeoplePickerProps) {
  const [search, setSearch] = useState("");
  const query = normalizeName(search);

  const isSelected = (name: string) => value.some((person) => normalizeName(person.name) === normalizeName(name));

  function toggle(person: SelectedPerson) {
    onChange(
      isSelected(person.name)
        ? value.filter((item) => normalizeName(item.name) !== normalizeName(person.name))
        : [...value, person],
    );
  }

  // Pessoas novas já selecionadas continuam visíveis, para poder desmarcar.
  const newPeople = value.filter((person) => !person.id);
  const options: SelectedPerson[] = [...people, ...newPeople].filter((person) =>
    normalizeName(person.name).includes(query),
  );

  const exactMatch = [...people, ...newPeople].find((person) => normalizeName(person.name) === query);
  const canCreate = query !== "" && !exactMatch;

  function submitSearch() {
    if (query === "") return;
    if (exactMatch) {
      if (!isSelected(exactMatch.name)) toggle(exactMatch);
    } else {
      toggle({ id: null, name: search.trim() });
    }
    setSearch("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        id="people-search"
        placeholder="Buscar ou criar pessoa"
        autoComplete="off"
        maxLength={80}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={handleKeyDown}
        className="h-11"
      />

      <div className="flex flex-wrap gap-2">
        {options.map((person) => {
          const selected = isSelected(person.name);
          return (
            <button
              key={person.id ?? person.name}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                toggle(person);
                setSearch("");
              }}
              className={cn(
                "flex h-10 max-w-full items-center gap-1 rounded-full border px-4 text-sm transition-colors",
                selected && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {selected && <CheckIcon className="size-4 shrink-0" />}
              <span className="truncate">{person.name}</span>
            </button>
          );
        })}

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
      </div>
    </div>
  );
}
