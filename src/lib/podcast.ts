import { cache } from "react";

import type { Episode } from "./episode";
export type { Episode } from "./episode";

const firstEpisode: Episode = {
  id: "xNfdDPhmEMU",
  title: "Capítulo 1",
  description: "El primer capítulo de Sin Anonimato.",
  duration: "",
  publishedAt: "",
  embeddable: true,
  thumbnailSize: "maxresdefault",
};

type Uploads = { items: { contentDetails: { relatedPlaylists: { uploads: string } } }[] };
type Playlist = { nextPageToken?: string; items: { contentDetails: { videoId: string } }[] };
type Videos = {
  items: {
    id: string;
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      liveBroadcastContent: string;
      thumbnails?: Partial<Record<"maxres" | "standard" | "high" | "medium", { url: string }>>;
    };
    statistics?: { viewCount?: string };
    contentDetails: { duration: string };
    status: { privacyStatus: string; embeddable: boolean };
  }[];
};

async function youtube<T>(resource: string, query: Record<string, string>, key: string, revalidate = 300): Promise<T> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  url.search = new URLSearchParams(query).toString();
  const response = await fetch(url, {
    headers: { "x-goog-api-key": key },
    next: { revalidate },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`YouTube ${resource}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export const getEpisodes = cache(async (): Promise<Episode[]> => {
  const fallback = [firstEpisode];
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return fallback;

  try {
    const channel = await youtube<Uploads>("channels", {
      part: "contentDetails", forHandle: "@SinAnonimato",
    }, key, 86400);
    const playlistId = channel.items[0]?.contentDetails.relatedPlaylists.uploads;
    if (!playlistId) return fallback;

    const episodes = new Map<string, Episode>();
    let pageToken = "";
    do {
      const page = await youtube<Playlist>("playlistItems", {
        part: "contentDetails", playlistId, maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      }, key);
      const ids = page.items.map(item => item.contentDetails.videoId);
      if (ids.length) {
        const videos = await youtube<Videos>("videos", {
          part: "snippet,contentDetails,status,statistics", id: ids.join(","),
        }, key);
        for (const video of videos.items) {
          if (!/^[\w-]{11}$/.test(video.id) || video.status.privacyStatus !== "public" || video.snippet.liveBroadcastContent === "upcoming") continue;
          const thumbnails = video.snippet.thumbnails;
          episodes.set(video.id, {
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            duration: video.contentDetails.duration,
            publishedAt: video.snippet.publishedAt,
            embeddable: video.status.embeddable,
            ...(video.statistics?.viewCount && /^\d+$/.test(video.statistics.viewCount) ? { viewCount: Number(video.statistics.viewCount) } : {}),
            thumbnailSize: thumbnails?.maxres ? "maxresdefault"
              : thumbnails?.standard ? "sddefault"
              : thumbnails?.high ? "hqdefault"
              : thumbnails?.medium ? "mqdefault" : undefined,
          });
        }
      }
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);

    return [...episodes.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  } catch {
    console.warn("No se pudo consultar el catálogo de YouTube.");
    return fallback;
  }
});
