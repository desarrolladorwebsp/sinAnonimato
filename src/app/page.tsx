import { ContactSection } from "@/components/contact-section";
import { Hero } from "@/components/hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteExperience } from "@/components/site-experience";

export default function Home() {
  return (
    <SiteExperience>
      <SiteHeader />
      <main id="contenido">
        <Hero />
        <ContactSection />
      </main>
      <SiteFooter />
    </SiteExperience>
  );
}
