"use client";

import { UserPlusIcon } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createPerson } from "@/app/(app)/pessoas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddPerson() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setName("");
  }

  // O Next mantém a página escondida com o estado intacto; ao sair dela, o campo volta a fechar.
  useEffect(() => close, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createPerson(name);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pessoa adicionada");
      close();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(true)}>
        <UserPlusIcon />
        Nova pessoa
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border p-3">
      <Input
        autoFocus
        aria-label="Nome da pessoa"
        placeholder="Nome da pessoa"
        maxLength={80}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-11"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={close}>
          Cancelar
        </Button>
        <Button type="submit" className="h-11" disabled={pending || name.trim() === ""}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
