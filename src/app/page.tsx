import { ContactSection } from "@/components/contact-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AboutSection } from "@/components/about-section";
import { YoutubeShorts } from "@/components/youtube-shorts";
import { publicMetadata, JsonLd } from "@/lib/seo";
import { ReviewsSection } from "@/components/review-carousel";
import { SponsorSection } from "@/components/sponsor-section";
import { InstagramReels } from "@/components/instagram-reels";
import { PodcastHome } from "@/components/podcast-views";
import { getEpisodes } from "@/lib/podcast";

export const metadata = publicMetadata("Sin Anonimato | Podcast de historias reales", "Mira los últimos capítulos de Sin Anonimato: conversaciones, historias de vida y voces que importan. Descubre nuestro podcast en video.", "/");

export default async function Home() {
  const episodes = await getEpisodes();
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "PodcastSeries", name: "Sin Anonimato", url: "https://www.sinanonimato.cl/", description: "Podcast de conversaciones e historias de vida.", inLanguage: "es", sameAs: ["https://www.youtube.com/@SinAnonimato", "https://www.instagram.com/sinanonimato.cl/"] }} />
      <SiteHeader />
      <main id="contenido">
        <PodcastHome episodes={episodes} />
        <YoutubeShorts />
        <InstagramReels />
        <ReviewsSection />
        <SponsorSection />
        <AboutSection />
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}
