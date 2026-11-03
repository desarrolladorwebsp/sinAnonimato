import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./authorizations.css";

const montserrat = localFont({
  src: [
    { path: "../assets/fonts/montserrat-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/montserrat-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/montserrat-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../assets/fonts/montserrat-latin-800-normal.woff2", weight: "800", style: "normal" },
    { path: "../assets/fonts/montserrat-latin-900-normal.woff2", weight: "900", style: "normal" },
    { path: "../assets/fonts/montserrat-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../assets/fonts/montserrat-latin-600-italic.woff2", weight: "600", style: "italic" },
    { path: "../assets/fonts/montserrat-latin-700-italic.woff2", weight: "700", style: "italic" },
    { path: "../assets/fonts/montserrat-latin-800-italic.woff2", weight: "800", style: "italic" },
    { path: "../assets/fonts/montserrat-latin-900-italic.woff2", weight: "900", style: "italic" },
  ],
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
      </body>
    </html>
  );
}
