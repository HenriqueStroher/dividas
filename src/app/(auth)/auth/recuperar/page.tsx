import type { Metadata } from "next";
import { RecoveryLinkHandler } from "@/components/auth/recovery-link-handler";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function RecoveryLinkPage() {
  return <RecoveryLinkHandler />;
}
