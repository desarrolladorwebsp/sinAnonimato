import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { EpisodeCards } from "@/components/episode-cards";
import { getEpisodes } from "@/lib/podcast";

import { recommendedEpisodes } from "@/lib/episode";
import { JsonLd, publicMetadata, siteUrl } from "@/lib/seo";

type PageProps = { params: Promise<{ videoId: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { videoId } = await params;
  const episode = (await getEpisodes()).find(item => item.id === videoId);
  if (!episode) return { title: "Capítulo no encontrado", robots: { index: false } };
  return publicMetadata(`${episode.title} | Sin Anonimato`, episode.description.slice(0, 160) || `Mira ${episode.title} en Sin Anonimato.`, `/capitulos/${episode.id}`, episode.thumbnailSize ? `https://i.ytimg.com/vi/${episode.id}/${episode.thumbnailSize}.jpg` : undefined);
}

export default async function EpisodePage({ params }: PageProps) {
  const { videoId } = await params;
  const episodes = await getEpisodes();
  const episode = episodes.find(item => item.id === videoId);
  if (!episode) notFound();
  const related = recommendedEpisodes(episodes, episode.id).slice(0, 12);

  return (
    <article className="podcast-wrap podcast-library">
      {episode.publishedAt && episode.thumbnailSize && <JsonLd data={{
        "@context": "https://schema.org", "@type": "VideoObject", name: episode.title,
        description: episode.description || episode.title,
        thumbnailUrl: `https://i.ytimg.com/vi/${episode.id}/${episode.thumbnailSize}.jpg`,
        uploadDate: episode.publishedAt, ...(episode.duration ? { duration: episode.duration } : {}),
        ...(episode.embeddable ? { embedUrl: `https://www.youtube-nocookie.com/embed/${episode.id}` } : {}),
        url: `${siteUrl}/capitulos/${episode.id}`,
        ...(episode.viewCount !== undefined ? { interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/WatchAction", userInteractionCount: episode.viewCount } } : {}),
      }} />}
      <Link className="podcast-back" href="/capitulos"><ArrowLeft size={18} aria-hidden="true" /> Todos los capítulos</Link>
      {episode.embeddable && (
        <iframe className="podcast-player" src={`https://www.youtube-nocookie.com/embed/${episode.id}?playsinline=1&rel=0`}
          title={`Reproductor de YouTube: ${episode.title}`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      )}
      <p className="section-eyebrow">Sin Anonimato · Capítulo</p>
      <h1>{episode.title}</h1>
      {!episode.embeddable && <p className="podcast-muted">Este video está disponible directamente en YouTube.</p>}
      <p className="podcast-description">{episode.description}</p>
      <a className="podcast-secondary" href={`https://www.youtube.com/watch?v=${episode.id}`} target="_blank" rel="noopener noreferrer">Abrir en YouTube <ArrowUpRight size={17} aria-hidden="true" /></a>
      {related.length > 0 && <section className="podcast-latest"><h2>{related.some(item => item.viewCount !== undefined) ? "Los más vistos para seguir mirando" : "Sigue descubriendo"}</h2><EpisodeCards episodes={related} carousel /></section>}
    </article>
  );
}
