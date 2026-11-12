import Link from "next/link";
import Image from "next/image";
import { Play } from "@phosphor-icons/react/ssr";
import { durationMinutes, type Episode } from "@/lib/episode";
import studioCover from "../../public/hero-studio.jpg";
import { StreamReveal } from "@/components/stream-reveal";

function episodeArtwork(episode: Episode | undefined, featured = false) {
  if (!episode?.thumbnailSize) return studioCover;
  const size = featured ? episode.thumbnailSize : "mqdefault";
  return `https://i.ytimg.com/vi/${episode.id}/${size}.jpg`;
}

export function EpisodeCards({ episodes, carousel = false }: { episodes: Episode[]; carousel?: boolean }) {
  return (
    <ul className={carousel ? "podcast-rail" : "podcast-grid"} tabIndex={carousel ? 0 : undefined} aria-label="Capítulos disponibles">
      {episodes.map((episode, index) => {
        const minutes = durationMinutes(episode.duration);
        return (
          <StreamReveal as="li" key={episode.id} index={index} direction={index % 2 ? "right" : "left"}>
            <Link className="podcast-card" href={`/capitulos/${episode.id}`} prefetch={false}>
              <div className="podcast-card-art">
                <Image src={episodeArtwork(episode)} alt="" fill unoptimized />
                <span className="podcast-card-play"><Play weight="fill" size={20} aria-hidden="true" /></span>
                {minutes > 0 && <span className="podcast-duration">{minutes} min</span>}
              </div>
              <span className="podcast-card-title">{episode.title}{episode.viewCount !== undefined && <span className="podcast-card-meta">{new Intl.NumberFormat("es-CL").format(episode.viewCount)} reproducciones en YouTube</span>}</span>
            </Link>
          </StreamReveal>
        );
      })}
    </ul>
  );
}

