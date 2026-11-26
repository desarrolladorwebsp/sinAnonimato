import { calendarDay, endOfRecordingDay } from "./authorizations/calendar-dates";
import { AuthorizationError } from "./authorizations/config";
import type { Connection, Database } from "./authorizations/db";
import { text } from "./authorizations/validation";
import { configuredEpisodes, type ScheduledEpisode, type VideoFormat } from "./episode";
import { knownYoutubeShortIds, youtubeShorts } from "@/content/youtube-shorts";

type ScheduleRow = Omit<ScheduledEpisode, "publishAt" | "removedAt"> & { publishAt: Date; removedAt: Date | null };
const scheduleColumns = 'youtube_id AS "youtubeId", title, format, publish_at AS "publishAt", removed_at AS "removedAt"';
const scheduleEntry = (row: ScheduleRow): ScheduledEpisode => ({
  ...row, publishAt: row.publishAt.toISOString(), removedAt: row.removedAt?.toISOString() ?? null,
});

const chileTime = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function publicationTime(day: string, time: string) {
  if (!endOfRecordingDay(day) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const wallTime = Date.parse(`${day}T${time}:00Z`);
  const candidates = new Set<number>();
  // Check offsets on both sides of midnight in case Chile changes its clocks.
  for (const sample of [wallTime - 86400000, wallTime + 86400000]) {
    const probe = new Date(sample);
    const offset = Date.parse(`${calendarDay(probe)}T${chileTime.format(probe)}:00Z`) - sample;
    const instant = new Date(wallTime - offset);
    if (calendarDay(instant) === day && chileTime.format(instant) === time) candidates.add(instant.getTime());
  }
  return candidates.size === 1 ? [...candidates][0] : null;
}

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

function videoFormat(value: unknown): VideoFormat {
  if (value === "chapter" || value === "short") return value;
  throw new AuthorizationError(400, "Selecciona si es un capítulo completo o un Short vertical.");
}

function youtubeVideo(value: unknown) {
  const url = URL.parse(text(value, "el enlace de YouTube", 1000));
  if (!url || url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname;
  const pathname = url.pathname.replace(/\/$/, "");
  const path = pathname.split("/").slice(1);
  let id: string | null = null;
  if (host === "youtu.be" && path.length === 1) id = path[0];
  if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
    if (pathname === "/watch") id = url.searchParams.get("v");
    if (path.length === 2 && ["live", "shorts", "embed"].includes(path[0])) id = path[1];
  }
  return id && videoIdPattern.test(id) ? { id, isShortLink: host !== "youtu.be" && path[0] === "shorts" } : null;
}

export async function listScheduledEpisodes(db: Connection): Promise<ScheduledEpisode[]> {
  const { rows } = await db.query<ScheduleRow>(`
    SELECT ${scheduleColumns} FROM sa_episode_schedule ORDER BY publish_at DESC, youtube_id
  `);
  return rows.map(scheduleEntry);
}

function validateFormat(id: string, value: unknown, isShortLink = false) {
  const format = videoFormat(value);
  if (format === "chapter" && (isShortLink || knownYoutubeShortIds.has(id))) {
    throw new AuthorizationError(400, "Ese enlace es de un Short. Selecciona Short vertical como formato.");
  }
  return format;
}

function scheduleFields(input: Record<string, unknown>, current?: ScheduleRow) {
  const video = youtubeVideo(input.url);
  if (!video) throw new AuthorizationError(400, "Ingresa un enlace válido a un video de YouTube.");
  const { id, isShortLink } = video;
  const format = validateFormat(id, input.format, isShortLink);
  if (id !== current?.youtubeId && (configuredEpisodes.some(episode => episode.id === id) || youtubeShorts.some(short => short.id === id))) {
    throw new AuthorizationError(409, "Ese video ya está publicado en el sitio.");
  }
  const title = text(input.title, "el título del video", 160);
  const day = text(input.date, "la fecha de publicación", 10);
  const time = text(input.time, "la hora de publicación", 5);
  const instant = publicationTime(day, time);
  if (instant === null) throw new AuthorizationError(400, "Selecciona una fecha y hora válidas para Chile continental. Si hay cambio de hora, elige otro horario.");
  if (instant <= Date.now() && (!current || instant !== Math.floor(+current.publishAt / 60000) * 60000)) {
    throw new AuthorizationError(400, "Selecciona una fecha y hora futuras para reprogramar.");
  }
  return { youtubeId: id, title, publishAt: new Date(instant).toISOString(), format };
}

async function insertSchedule(db: Connection, scheduled: ScheduledEpisode, actor: string) {
  const { rows: [row] } = await db.query<ScheduleRow>(`
    INSERT INTO sa_episode_schedule (youtube_id, title, publish_at, created_by, format)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (youtube_id) DO UPDATE SET title=excluded.title, publish_at=excluded.publish_at,
      format=excluded.format, removed_at=NULL, updated_by=excluded.created_by
    WHERE sa_episode_schedule.removed_at IS NOT NULL
    RETURNING ${scheduleColumns}
  `, [scheduled.youtubeId, scheduled.title, scheduled.publishAt, actor, scheduled.format]);
  if (!row) throw new AuthorizationError(409, "Ese video ya está registrado en el calendario.");
  return scheduleEntry(row);
}

export async function scheduleEpisode(db: Connection, input: Record<string, unknown>, actor: string) {
  return insertSchedule(db, scheduleFields(input), actor);
}

export async function updateScheduledEpisode(db: Database, id: string, input: Record<string, unknown>, actor: string) {
  if (!videoIdPattern.test(id)) throw new AuthorizationError(400, "Identificador de video inválido.");
  return db.transaction(async connection => {
    const { rows: [current] } = await connection.query<ScheduleRow>(`SELECT ${scheduleColumns} FROM sa_episode_schedule WHERE youtube_id=$1 FOR UPDATE`, [id]);
    if (!current || current.removedAt) throw new AuthorizationError(404, "El video ya fue retirado del calendario.");
    if (input.action === "remove") {
      const { rows: [removed] } = await connection.query<ScheduleRow>(`
        UPDATE sa_episode_schedule SET removed_at=now(), updated_by=$2 WHERE youtube_id=$1
        RETURNING ${scheduleColumns}
      `, [id, actor]);
      return { video: scheduleEntry(removed) };
    }
    if (input.action !== undefined && input.action !== "edit") throw new AuthorizationError(400, "Acción de programación inválida.");
    const next = input.action === "edit"
      ? scheduleFields(input, current)
      : { ...scheduleEntry(current), format: validateFormat(id, input.format) };
    if (next.youtubeId !== id) {
      const { rows: [removed] } = await connection.query<ScheduleRow>(`
        UPDATE sa_episode_schedule SET removed_at=now(), updated_by=$2 WHERE youtube_id=$1
        RETURNING ${scheduleColumns}
      `, [id, actor]);
      return { video: await insertSchedule(connection, next, actor), replaced: scheduleEntry(removed) };
    }
    const { rows: [row] } = await connection.query<ScheduleRow>(`
      UPDATE sa_episode_schedule SET title=$2, format=$3, publish_at=$4, updated_by=$5 WHERE youtube_id=$1
      RETURNING ${scheduleColumns}
    `, [id, next.title, next.format, next.publishAt, actor]);
    return { video: scheduleEntry(row) };
  });
}
