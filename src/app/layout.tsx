import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { LiveIndicator } from "@/components/live-indicator";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sin Anonimato",
  description:
    "Un espacio para escuchar, visibilizar y dar voz a las historias que importan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <LiveIndicator />
      </body>
    </html>
  );
}
