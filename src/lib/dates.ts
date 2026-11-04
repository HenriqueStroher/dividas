/** Data de hoje (AAAA-MM-DD) no Brasil. O servidor da Vercel roda em UTC. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** AAAA-MM-DD → DD/MM/AAAA, sem passar por Date, que poderia mudar o dia por causa do fuso. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
