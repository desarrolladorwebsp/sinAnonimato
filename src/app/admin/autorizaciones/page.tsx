import type { Metadata } from "next";
import { AdminPanel } from "@/components/authorizations/admin-panel";
export const metadata: Metadata = { title: "Producción | Sin Anonimato", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };
export default function Page() { return <AdminPanel />; }
