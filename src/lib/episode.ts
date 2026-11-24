import { youtubeShorts, type YoutubeShort } from "@/content/youtube-shorts";

export type Episode = {
  id: string;
  title: string;
  description: string;
  duration: string;
  publishedAt: string;
  embeddable: boolean;
  viewCount?: number;
  thumbnailSize?: "maxresdefault" | "sddefault" | "hqdefault" | "mqdefault";
};


/** Unknown statistics never rank ahead of verified counts. Keep newest order for ties. */
export function recommendedEpisodes(episodes: Episode[], excludeId?: string) {
  return episodes.filter(episode => episode.id !== excludeId).sort((a, b) =>
    (b.viewCount ?? -1) - (a.viewCount ?? -1) || b.publishedAt.localeCompare(a.publishedAt));
}
export function durationMinutes(duration: string) {
  return Math.floor(durationSeconds(duration) / 60);
}

function durationSeconds(duration: string) {
  const time = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(duration);
  return Number(time?.[1] ?? 0) * 86400 + Number(time?.[2] ?? 0) * 3600 + Number(time?.[3] ?? 0) * 60 + Number(time?.[4] ?? 0);
}

const firstEpisode: Episode = {
  id: "xNfdDPhmEMU",
  title: "Capítulo 1: Artistas callejeros",
  description: "El primer capítulo de Sin Anonimato.",
  duration: "",
  publishedAt: "",
  embeddable: true,
  thumbnailSize: "maxresdefault",
};

const secondEpisode: Episode = {
  id: "-q6uhzBdQJc",
  title: "Capítulo 2",
  description: "El segundo capítulo de Sin Anonimato.",
  duration: "",
  publishedAt: "",
  embeddable: true,
  thumbnailSize: "maxresdefault",
};
export const configuredEpisodes = [secondEpisode, firstEpisode];

export const publicationFormats = { chapter: "Capítulo / video completo", short: "Short vertical" } as const;
export type VideoFormat = keyof typeof publicationFormats;
export type ScheduledEpisode = { youtubeId: string; title: string; publishAt: string; format: VideoFormat; removedAt?: string | null; available?: boolean };

function publishedSchedule(schedule: ScheduledEpisode[], format: VideoFormat, now: number) {
  return schedule.filter(item => item.format === format && !item.removedAt && item.available === true && Date.parse(item.publishAt) <= now)
    .sort((first, second) => second.publishAt.localeCompare(first.publishAt));
}

export function selectCatalogShorts(discovered: Episode[], schedule: ScheduledEpisode[], now: number): YoutubeShort[] {
  const scheduledIds = new Set(schedule.map(item => item.youtubeId));
  const metadata = new Map(discovered.map(item => [item.id, item]));
  return [
    ...publishedSchedule(schedule, "short", now).map(({ youtubeId, title }) => ({ id: youtubeId, title, embeddable: metadata.get(youtubeId)?.embeddable })),
    ...youtubeShorts.filter(item => !scheduledIds.has(item.id)),
  ];
}

export function selectCatalogEpisodes(discovered: Episode[], schedule: ScheduledEpisode[], now: number) {
  const scheduledIds = new Set(schedule.map(item => item.youtubeId));
  const metadata = new Map(discovered.map(item => [item.id, item]));
  const scheduled = publishedSchedule(schedule, "chapter", now)
    .map(({ youtubeId, title, publishAt }): Episode => ({
      id: youtubeId,
      description: "Capítulo del podcast Sin Anonimato.",
      duration: "",
      embeddable: true,
      thumbnailSize: "hqdefault",
      ...metadata.get(youtubeId),
      title,
      publishedAt: publishAt,
    }));
  const configured = configuredEpisodes.filter(item => !scheduledIds.has(item.id))
    .map(item => ({ ...item, ...metadata.get(item.id), title: item.title }));
  const configuredIds = new Set(configured.map(item => item.id));
  const curatedShortIds = new Set(youtubeShorts.map(item => item.id));
  const automatic = discovered
    // YouTube uploads do not tell us which short-duration videos are vertical.
    .filter(item => !configuredIds.has(item.id) && !scheduledIds.has(item.id) && !curatedShortIds.has(item.id) && durationSeconds(item.duration) > 180)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (!scheduled.length) return [...configured, ...automatic];

  const firstScheduled = Date.parse(scheduled[scheduled.length - 1].publishedAt);
  const recent = automatic.filter(item => Date.parse(item.publishedAt) >= firstScheduled);
  const recentIds = new Set(recent.map(item => item.id));
  return [
    ...[...scheduled, ...recent].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
    ...configured,
    ...automatic.filter(item => !recentIds.has(item.id)),
  ];
}
