"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-muted-foreground">Não foi possível carregar. Verifique sua internet.</p>
      <Button type="button" variant="outline" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
