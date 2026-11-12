import { StreamReveal } from "./stream-reveal";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play } from "@phosphor-icons/react/ssr";
import type { Episode } from "@/lib/podcast";
import studioCover from "../../public/hero-studio.jpg";
import { EpisodeCards } from "./episode-cards";

function episodeArtwork(episode: Episode | undefined, featured = false) {
  if (!episode?.thumbnailSize) return studioCover;
  const size = featured ? episode.thumbnailSize : "mqdefault";
  return `https://i.ytimg.com/vi/${episode.id}/${size}.jpg`;
}

export function PodcastHome({ episodes }: { episodes: Episode[] }) {
  const [featured] = episodes;
  return (
    <>
      <section id="inicio" className="podcast-feature">
        <div className={`podcast-feature-art${featured?.thumbnailSize ? "" : " podcast-feature-studio"}`}>
          <Image src={episodeArtwork(featured, true)} alt="" fill unoptimized preload />
        </div>
        <StreamReveal className="podcast-feature-copy">
          <p className="section-eyebrow podcast-feature-label">{featured ? "Último capítulo" : "El podcast"}</p>
          <p className="podcast-brandline">Sin Anonimato / El podcast</p>
          <h1>{featured?.title ?? "Historias reales. Voces que importan."}</h1>
          <p>{featured?.description.split(/\n/).find(line => line.trim()) || "Conversaciones completas para escuchar con tiempo."}</p>
          <div className="podcast-actions">
            {featured && <Link className="podcast-primary" href={`/capitulos/${featured.id}`}><Play weight="fill" size={18} aria-hidden="true" /> Ver último capítulo</Link>}
            <Link className="podcast-secondary" href="/capitulos">Todos los capítulos <ArrowRight size={19} aria-hidden="true" /></Link>
          </div>
        </StreamReveal>
      </section>
      <section id="capitulos" className="podcast-wrap podcast-latest" aria-labelledby="latest-episodes">
        <div className="podcast-heading">
          <h2 id="latest-episodes">Últimos capítulos</h2>
          <Link href="/capitulos">Ver catálogo <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        {episodes.length ? <EpisodeCards episodes={episodes.slice(0, 12)} carousel /> : <p className="podcast-muted">Los capítulos publicados aparecerán aquí.</p>}
      </section>
    </>
  );
}
