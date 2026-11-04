"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/app/(app)/dividas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { digitsToCents, formatCents } from "@/lib/money";
import { buildDebtSplit } from "@/lib/split";
import { cn } from "@/lib/utils";
import { debtFormSchema, type DebtFormValues } from "@/lib/validations/debt";
import type { Person } from "@/services/supabase/queries";
import { PeoplePicker } from "./people-picker";

type DebtFormProps = {
  people: Person[];
  defaultValues: DebtFormValues;
  submitLabel: string;
  /** Destino depois de salvar. */
  redirectTo: string;
  hint?: string;
  onSave: (values: DebtFormValues) => Promise<ActionResult>;
};

const DIRECTIONS = [
  { value: "owed_to_me", label: "Me devem", selected: "border-emerald-600 bg-emerald-50 text-emerald-700" },
  { value: "i_owe", label: "Eu devo", selected: "border-red-600 bg-red-50 text-red-700" },
] as const;

export function DebtForm({ people, defaultValues, submitLabel, redirectTo, hint, onSave }: DebtFormProps) {
  const router = useRouter();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues,
  });

  const totalCents = useWatch({ control, name: "totalCents" });
  const selected = useWatch({ control, name: "people" });
  const includeMe = useWatch({ control, name: "includeMe" });
  const direction = useWatch({ control, name: "direction" });

  const preview = useMemo(() => {
    if (selected.length === 0 || totalCents < selected.length + (includeMe ? 1 : 0)) return null;
    return buildDebtSplit(
      totalCents,
      selected.map((person) => person.name),
      includeMe,
    );
  }, [totalCents, selected, includeMe]);

  async function onSubmit(values: DebtFormValues) {
    const result = await onSave(values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Dívida salva");
    router.push(redirectTo);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="totalCents">Valor</Label>
        <Controller
          control={control}
          name="totalCents"
          render={({ field }) => (
            <Input
              id="totalCents"
              inputMode="numeric"
              autoComplete="off"
              autoFocus={defaultValues.totalCents === 0}
              aria-invalid={!!errors.totalCents}
              value={formatCents(field.value)}
              onChange={(event) => field.onChange(digitsToCents(event.target.value))}
              onBlur={field.onBlur}
              ref={field.ref}
              className="h-14 text-center text-2xl font-semibold tabular-nums md:text-2xl"
            />
          )}
        />
        <FieldError message={errors.totalCents?.message} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm leading-none font-medium">Tipo</legend>
        <Controller
          control={control}
          name="direction"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {DIRECTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={field.value === option.value}
                  onClick={() => field.onChange(option.value)}
                  className={cn(
                    "h-12 rounded-lg border text-sm font-medium transition-colors",
                    field.value === option.value ? option.selected : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        />
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="people-search">Pessoas</Label>
        <Controller
          control={control}
          name="people"
          render={({ field }) => <PeoplePicker people={people} value={field.value} onChange={field.onChange} />}
        />
        <FieldError message={errors.people?.message} />
      </div>

      <Controller
        control={control}
        name="includeMe"
        render={({ field }) => (
          <Label htmlFor="includeMe" className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span className="flex flex-col gap-1">
              <span>Me incluir na divisão</span>
              <span className="text-xs font-normal text-muted-foreground">
                {includeMeHint(field.value, direction)}
              </span>
            </span>
            <Switch id="includeMe" checked={field.value} onCheckedChange={field.onChange} />
          </Label>
        )}
      />

      {preview && (
        <section aria-label="Prévia da divisão" className="flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm">
          {preview.shares.map((share) => (
            <p key={share.id} className="flex justify-between gap-4">
              <span className="truncate">{share.id}</span>
              <span className="tabular-nums">{formatCents(share.amountCents)}</span>
            </p>
          ))}
          {preview.selfShareCents > 0 && (
            <p className="flex justify-between gap-4 text-muted-foreground">
              <span>Você (não vira dívida)</span>
              <span className="tabular-nums">{formatCents(preview.selfShareCents)}</span>
            </p>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Origem</Label>
        <Input
          id="description"
          placeholder="Ex: Festa praia"
          maxLength={200}
          aria-invalid={!!errors.description}
          className="h-11"
          {...register("description")}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="occurredOn">Data</Label>
        <Input
          id="occurredOn"
          type="date"
          aria-invalid={!!errors.occurredOn}
          className="h-11"
          {...register("occurredOn")}
        />
        <FieldError message={errors.occurredOn?.message} />
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <Button type="submit" disabled={isSubmitting} className="h-12">
        {isSubmitting ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}

function includeMeHint(includeMe: boolean, direction: DebtFormValues["direction"]) {
  if (includeMe) return "Você entra como mais uma parte, e essa parte não vira dívida.";
  return direction === "owed_to_me" ? "As pessoas te pagam o valor total." : "Você paga o valor total às pessoas.";
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
