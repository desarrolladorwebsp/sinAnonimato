import { unstable_cache } from "next/cache";
import { connection } from "next/server";

import { featuredInstagramPosts, getInstagramPostUrl, instagramProfile, type InstagramPost } from "@/content/instagram-reels";
import { durationSeconds, type PublishedYoutubeShort } from "./episode";

const refreshInterval = 300;
const youtubeChannelId = "UCzUz2nb8y5Qsysm2qMEDs_A";
const instagramUsername = new URL(instagramProfile).pathname.split("/")[1];
const instagramDate = new Intl.DateTimeFormat("es-CL", {
  day: "numeric", month: "long", timeZone: "America/Santiago",
});

async function requestJson<T>(url: URL | string, options: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store", redirect: "error" });
  if (!response.ok) throw new Error(`La API respondió con HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

type YoutubeCredentials = { clientId: string; clientSecret: string; refreshToken: string };
type YoutubeVideo = {
  id: string;
  snippet: { channelId: string; title: string; publishedAt: string; liveBroadcastContent: string };
  status: { privacyStatus: string; embeddable: boolean };
  contentDetails: { duration: string };
  fileDetails?: { videoStreams?: { widthPixels: number; heightPixels: number; rotation?: string; aspectRatio?: number }[] };
};

function publicShort(video: YoutubeVideo): PublishedYoutubeShort | null {
  if (!/^[\w-]{11}$/.test(video.id) || video.snippet.channelId !== youtubeChannelId ||
    video.status.privacyStatus !== "public" || video.snippet.liveBroadcastContent !== "none") return null;

  const duration = durationSeconds(video.contentDetails.duration);
  const publishedAt = Date.parse(video.snippet.publishedAt);
  const stream = video.fileDetails?.videoStreams?.[0];
  if (!stream || duration <= 0 || duration > 180 || !Number.isFinite(publishedAt) ||
    publishedAt < Date.UTC(2024, 9, 15)) return null;

  if (stream.widthPixels <= 0 || stream.heightPixels <= 0 || stream.rotation === "other") return null;
  const rotated = stream.rotation === "clockwise" || stream.rotation === "counterClockwise";
  const aspectRatio = rotated ? stream.heightPixels / stream.widthPixels
    : stream.aspectRatio || stream.widthPixels / stream.heightPixels;
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0 || aspectRatio > 1) return null;

  return { id: video.id, title: video.snippet.title, publishedAt, embeddable: video.status.embeddable };
}

export async function fetchYoutubeShorts({ clientId, clientSecret, refreshToken }: YoutubeCredentials) {
  const signal = AbortSignal.timeout(6000);
  const { access_token: token } = await requestJson<{ access_token?: string }>("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    signal,
  });
  if (!token) throw new Error("YouTube no devolvió un token de acceso.");

  const youtube = <T>(resource: string, query: Record<string, string>) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    url.search = new URLSearchParams(query).toString();
    return requestJson<T>(url, { headers: { Authorization: `Bearer ${token}` }, signal });
  };
  const { items: channels } = await youtube<{ items: { id: string; contentDetails: { relatedPlaylists: { uploads: string } } }[] }>("channels", {
    part: "contentDetails", mine: "true",
  });
  const playlistId = channels.find(channel => channel.id === youtubeChannelId)?.contentDetails.relatedPlaylists.uploads;
  if (!playlistId) throw new Error("La conexión no corresponde al canal de Sin Anonimato.");

  const shorts = new Map<string, PublishedYoutubeShort>();
  let pageToken: string | undefined;
  do {
    const page: { items: { contentDetails: { videoId: string } }[]; nextPageToken?: string } = await youtube("playlistItems", {
      part: "contentDetails", playlistId, maxResults: "50", ...(pageToken ? { pageToken } : {}),
    });
    const ids = page.items.map(item => item.contentDetails.videoId);
    if (ids.length) {
      const { items } = await youtube<{ items: YoutubeVideo[] }>("videos", {
        part: "snippet,status,contentDetails,fileDetails", id: ids.join(","),
        fields: "items(id,snippet(channelId,title,publishedAt,liveBroadcastContent),status(privacyStatus,embeddable),contentDetails(duration),fileDetails(videoStreams(widthPixels,heightPixels,rotation,aspectRatio)))",
      });
      for (const item of items) {
        const short = publicShort(item);
        if (short) shorts.set(short.id, short);
      }
    }
    pageToken = page.nextPageToken;
    // Keep extra candidates because the calendar can withhold certain videos.
  } while (pageToken && shorts.size < 10);
  return [...shorts.values()].sort((a, b) => b.publishedAt - a.publishedAt);
}

type InstagramMedia = { media_product_type: string; permalink: string; timestamp: string };
type InstagramMediaPage = { data: InstagramMedia[]; paging?: { next?: string; cursors?: { after?: string } } };

export async function fetchInstagramReels(accountId: string, token: string) {
  if (!/^\d+$/.test(accountId)) throw new Error("Identificador de Instagram inválido.");
  const signal = AbortSignal.timeout(6000);
  const graph = <T>(path: string, query: Record<string, string>) => {
    const url = new URL(`https://graph.facebook.com/v27.0/${accountId}${path}`);
    url.search = new URLSearchParams(query).toString();
    return requestJson<T>(url, { headers: { Authorization: `Bearer ${token}` }, signal });
  };
  const account = await graph<{ username?: string }>("", { fields: "username" });
  if (account.username?.toLowerCase() !== instagramUsername) throw new Error("La conexión no corresponde al Instagram de Sin Anonimato.");

  const reels = new Map<string, number>();
  let after: string | undefined;
  do {
    const page: InstagramMediaPage = await graph("/media", {
      fields: "media_product_type,permalink,timestamp", limit: "25", ...(after ? { after } : {}),
    });
    for (const item of page.data) {
      const permalink = item.media_product_type === "REELS" ? getInstagramPostUrl(item.permalink) : null;
      const timestamp = Date.parse(item.timestamp);
      if (permalink && Number.isFinite(timestamp)) reels.set(permalink, timestamp);
    }
    after = page.paging?.next ? page.paging.cursors?.after : undefined;
  } while (after && reels.size < 3);
  return [...reels].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([url, timestamp]): InstagramPost => ({
    url, title: `Reel del ${instagramDate.format(timestamp)}`,
  }));
}

export async function getLatestYoutubeShorts() {
  const clientId = process.env.YOUTUBE_SHORTS_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_SHORTS_CLIENT_SECRET?.trim();
  const refreshToken = process.env.YOUTUBE_SHORTS_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken || process.env.STATIC_EXPORT === "1") return null;

  await connection();
  try {
    return await unstable_cache(() => fetchYoutubeShorts({ clientId, clientSecret, refreshToken }),
      ["youtube-shorts", youtubeChannelId], { revalidate: refreshInterval })();
  } catch {
    console.warn("No se pudo consultar la selección automática de Shorts.");
    return null;
  }
}

export async function getLatestInstagramReels(): Promise<readonly InstagramPost[]> {
  const accountId = process.env.INSTAGRAM_REELS_ACCOUNT_ID?.trim();
  const token = process.env.INSTAGRAM_REELS_ACCESS_TOKEN?.trim();
  if (!accountId || !token || process.env.STATIC_EXPORT === "1") return featuredInstagramPosts;

  await connection();
  try {
    return await unstable_cache(() => fetchInstagramReels(accountId, token),
      ["instagram-reels", accountId], { revalidate: refreshInterval })();
  } catch {
    console.warn("No se pudo consultar la selección automática de Reels.");
    return featuredInstagramPosts;
  }
}
