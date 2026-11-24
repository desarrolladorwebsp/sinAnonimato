import { cache } from "react";

import { connection } from "next/server";
import { database } from "./authorizations/db";
import { selectCatalogEpisodes, selectCatalogShorts, type Episode, type ScheduledEpisode } from "./episode";
import { listScheduledEpisodes } from "./episode-schedule";
import { verifyScheduledAvailability } from "./youtube-availability";
export type { Episode } from "./episode";

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

async function discoverEpisodes(): Promise<Episode[]> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return [];

  try {
    const channel = await youtube<Uploads>("channels", {
      part: "contentDetails", forHandle: "@SinAnonimato",
    }, key, 86400);
    const playlistId = channel.items[0]?.contentDetails.relatedPlaylists.uploads;
    if (!playlistId) return [];

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

    return [...episodes.values()];
  } catch {
    console.warn("No se pudo consultar el catálogo de YouTube.");
    return [];
  }
}

function publicMedia(discovered: Episode[], schedule: ScheduledEpisode[]) {
  const now = Date.now();
  return {
    episodes: selectCatalogEpisodes(discovered, schedule, now),
    shorts: selectCatalogShorts(discovered, schedule, now),
  };
}

export const getPodcastMedia = cache(async () => {
  if (!process.env.DATABASE_URL) return publicMedia(await discoverEpisodes(), []);

  // The published list depends on the current instant, even without any administrator action.
  await connection();
  try {
    const [discovered, schedule] = await Promise.all([
      discoverEpisodes(), listScheduledEpisodes(database()).then(entries => verifyScheduledAvailability(entries)),
    ]);
    return publicMedia(discovered, schedule);
  } catch {
    // A temporary database failure must not expose a video via YouTube discovery before its scheduled time.
    console.warn("No se pudo consultar la programación de capítulos.");
    return publicMedia([], []);
  }
});

export async function getEpisodes() {
  return (await getPodcastMedia()).episodes;
}
