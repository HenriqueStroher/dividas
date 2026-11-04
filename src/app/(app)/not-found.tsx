import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-muted-foreground">Não encontramos o que você procura.</p>
      <Button asChild variant="outline">
        <Link href="/">Voltar para os saldos</Link>
      </Button>
    </div>
  );
}
