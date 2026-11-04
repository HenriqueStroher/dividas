"use client";

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
      {state.message && (
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Aguarde..." : submitLabel}
      </Button>
    </form>
  );
}
