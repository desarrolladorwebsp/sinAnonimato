import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function EpisodesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader innerPage />
      <main id="contenido">{children}</main>
      <SiteFooter innerPage />
    </>
  );
}
