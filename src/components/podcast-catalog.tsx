"use client";

import { useState } from "react";
import { recommendedEpisodes, type Episode } from "@/lib/episode";
import { EpisodeCards } from "./episode-cards";

export function PodcastCatalog({ episodes }: { episodes: Episode[] }) {
  const [sort, setSort] = useState("latest");
  const [query, setQuery] = useState("");
  const normalize = (value: string) => value.toLocaleLowerCase("es").normalize("NFD").replace(/\p{M}/gu, "");
  const ordered = sort === "popular" ? recommendedEpisodes(episodes) : episodes;
  const matches = ordered.filter(episode => normalize(episode.title).includes(normalize(query.trim())));

  return (
    <>
      <div className="catalog-tools">{episodes.length > 0 && (
        <label className="podcast-search">
          Buscar por título
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Escribe el nombre del capítulo" />
        </label>
      )}
      {episodes.some(episode => episode.viewCount !== undefined) && <label className="catalog-sort">Ordenar por<select value={sort} onChange={event => setSort(event.target.value)}><option value="latest">Más recientes</option><option value="popular">Más vistos</option></select></label>}
      </div><p className="catalog-count" aria-live="polite">{matches.length} {matches.length === 1 ? "capítulo disponible" : "capítulos disponibles"}</p>
      {matches.length > 0
        ? <EpisodeCards episodes={matches} />
        : <p className="podcast-muted" role="status">{episodes.length ? "No hay capítulos que coincidan con tu búsqueda." : "Los capítulos publicados aparecerán aquí."}</p>}
    </>
  );
}
