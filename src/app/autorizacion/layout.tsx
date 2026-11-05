import type { Metadata } from "next";
import { connection } from "next/server";
export const metadata: Metadata = { title: "Tu autorización | Sin Anonimato", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };
export default async function Layout({ children }: { children: React.ReactNode }) { await connection(); return children; }
