"use client";

import { type ComponentProps, type Ref, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { digitsToCents, formatCents } from "@/lib/money";

type CurrencyInputProps = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "ref"> & {
  cents: number;
  onCentsChange: (cents: number) => void;
  ref?: Ref<HTMLInputElement>;
};

/**
 * Campo de valor que se preenche como um caixa eletrônico: cada dígito entra pela direita.
 * O cursor fica sempre no fim. Em outro lugar, os dígitos entrariam antes dos centavos,
 * e "100" poderia virar milhares de reais.
 */
export function CurrencyInput({ cents, onCentsChange, ref, ...props }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function keepCaretAtEnd() {
      const input = inputRef.current;
      if (!input || document.activeElement !== input) return;
      const end = input.value.length;
      if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
    }
    document.addEventListener("selectionchange", keepCaretAtEnd);
    return () => document.removeEventListener("selectionchange", keepCaretAtEnd);
  }, []);

  return (
    <Input
      {...props}
      inputMode="numeric"
      autoComplete="off"
      value={formatCents(cents)}
      onChange={(event) => onCentsChange(digitsToCents(event.target.value))}
      ref={(element) => {
        inputRef.current = element;
        if (typeof ref === "function") ref(element);
        else if (ref) ref.current = element;
      }}
    />
  );
}
