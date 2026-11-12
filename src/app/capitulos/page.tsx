import { publicMetadata } from "@/lib/seo";
import { PodcastCatalog } from "@/components/podcast-catalog";
import { getEpisodes } from "@/lib/podcast";

export const metadata = publicMetadata("Capítulos | Sin Anonimato", "Explora los capítulos completos de Sin Anonimato. Encuentra conversaciones e historias de vida para ver y escuchar sin salir de la web.", "/capitulos");

export default async function EpisodesPage() {
  const episodes = await getEpisodes();
  return (
    <section className="podcast-wrap podcast-library">
      <p className="section-eyebrow">Sin Anonimato · El podcast</p>
      <h1>Todos los capítulos</h1>
      <p className="podcast-muted">Elige una historia y mira el episodio completo.</p>
      <PodcastCatalog episodes={episodes} />
    </section>
  );
}
