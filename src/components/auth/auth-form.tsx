"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import type { AuthFormState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Field = {
  name: "email" | "password";
  label: string;
  autoComplete: string;
};

type AuthFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  fields: Field[];
  submitLabel: string;
};

export function AuthForm({ action, fields, submitLabel }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  // Some com o formulário depois do envio: o limite é baixo, e um segundo toque gastaria outro e-mail.
  if (state.message) {
    return (
      <div role="status" className="flex gap-3 rounded-lg border bg-muted p-4 text-sm">
        <MailCheck aria-hidden className="size-5 shrink-0" />
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.name === "email" ? "email" : "password"}
            autoComplete={field.autoComplete}
            required
            className="h-11"
          />
        </div>
      ))}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Aguarde..." : submitLabel}
      </Button>
    </form>
  );
}
