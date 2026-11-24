import { useEffect, useState } from "react";
import { CaretLeft, CaretRight, Plus, YoutubeLogo } from "@phosphor-icons/react";
import { calendarDate, calendarDay, shiftCalendarDay } from "@/lib/authorizations/calendar-dates";
import { localDate, type Authorization } from "@/lib/authorizations/types";
import { publicationFormats, type ScheduledEpisode } from "@/lib/episode";

type CalendarInvitation = {
  id: string;
  name: string;
  episode: string;
  recordingAt: string;
  inviteExpires: string;
  state: Authorization["state"];
  acceptedAt: string | null;
};
type View = "month" | "week" | "day";
type Tone = "green" | "yellow" | "red" | "blue" | "violet";
type CalendarEntry = { key: string; name: string; description: string; label: string; tone: Tone; open: () => void };

const modes: Record<View, string> = { month: "Mes", week: "Semana", day: "Día" };
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const monthLabel = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeZone: "UTC" });
const weekLabel = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function invitationStatus(row: CalendarInvitation, now: number): { tone: Tone; label: string } {
  if (row.state === "confirmed") return { tone: "green", label: "Aceptada" };
  if (row.state === "rejected") return { tone: "red", label: "Rechazada" };
  if (row.state === "cancelled") return { tone: "red", label: "Anulada" };
  if (!row.acceptedAt && Date.parse(row.inviteExpires) <= now) return { tone: "red", label: "Vencida sin respuesta" };
  return { tone: "yellow", label: row.acceptedAt ? "Pendiente de confirmación" : "Pendiente de respuesta" };
}

function weekStart(day: string) {
  return shiftCalendarDay(day, -((calendarDate(day).getUTCDay() + 6) % 7));
}

function shiftMonth(day: string, amount: number) {
  const date = calendarDate(`${day.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}

export function InvitationCalendar<Row extends CalendarInvitation>({ rows, episodes, day, onChangeDay, onSelectDay, onCreate, onSchedule, onDetail, onEpisode, busy }: {
  rows: Row[];
  episodes: ScheduledEpisode[];
  day: string;
  onChangeDay: (day: string) => void;
  onSelectDay: (day: string) => void;
  onCreate: (day: string) => void;
  onSchedule?: (day: string) => void;
  onDetail: (row: Row) => void;
  onEpisode: (episode: ScheduledEpisode) => void;
  busy: boolean;
}) {
  const [view, setView] = useState<View>("month");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = calendarDay(new Date(now));
  const start = weekStart(view === "month" ? `${day.slice(0, 7)}-01` : day);
  const end = view === "month" ? shiftCalendarDay(weekStart(shiftCalendarDay(shiftMonth(day, 1), -1)), 7) : shiftCalendarDay(start, 7);
  const days: string[] = [];
  if (view !== "day") {
    for (let current = start; current < end; current = shiftCalendarDay(current, 1)) days.push(current);
  }
  const grouped = new Map<string, CalendarEntry[]>();
  function addEntry(instant: string, entry: CalendarEntry) {
    const date = calendarDay(instant);
    const entries = grouped.get(date) ?? [];
    entries.push(entry);
    grouped.set(date, entries);
  }
  for (const episode of episodes) {
    addEntry(episode.publishAt, {
      key: `episode-${episode.youtubeId}`,
      name: episode.title,
      description: `${publicationFormats[episode.format]} · ${localDate(episode.publishAt)}`,
      label: episode.removedAt ? "Retirado" : Date.parse(episode.publishAt) > now ? "Programado" : episode.available ? "Publicado en el sitio" : "Pendiente en YouTube",
      tone: episode.format === "short" ? "violet" : "blue",
      open: () => onEpisode(episode),
    });
  }
  for (const row of rows) {
    addEntry(row.recordingAt, { key: row.id, name: row.name, description: row.episode, ...invitationStatus(row, now), open: () => onDetail(row) });
  }
  const entries = grouped.get(day) ?? [];
  const title = view === "month" ? monthLabel.format(calendarDate(day)) : view === "week"
    ? weekLabel.formatRange(calendarDate(start), calendarDate(shiftCalendarDay(end, -1)))
    : dayLabel.format(calendarDate(day));

  function navigate(amount: number) {
    onChangeDay(view === "month" ? shiftMonth(day, amount) : shiftCalendarDay(day, amount * (view === "week" ? 7 : 1)));
  }

  return <section className="invitation-calendar" aria-label="Calendario de grabaciones y publicaciones">
    <div className="invitation-calendar-toolbar">
      <div className="invitation-calendar-navigation" aria-label="Navegación del calendario" role="group">
        <button type="button" aria-label="Período anterior" onClick={() => navigate(-1)}><CaretLeft size={18} aria-hidden="true" /></button>
        <button type="button" onClick={() => { const current = Date.now(); setNow(current); onChangeDay(calendarDay(new Date(current))); }}>Hoy</button>
        <button type="button" aria-label="Período siguiente" onClick={() => navigate(1)}><CaretRight size={18} aria-hidden="true" /></button>
      </div>
      <h2 aria-live="polite">{title}</h2>
      <div className="invitation-calendar-modes" aria-label="Vista del calendario" role="group">
        {Object.entries(modes).map(([mode, label]) => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode as View)}>{label}</button>)}
      </div>
    </div>
    <ul className="invitation-calendar-legend" aria-label="Estados del calendario">
      <li data-tone="green">Aceptadas</li>
      <li data-tone="yellow">Pendientes</li>
      <li data-tone="red">Rechazadas, anuladas o vencidas</li>
      <li data-tone="blue">Capítulos completos</li>
      <li data-tone="violet">Shorts verticales</li>
    </ul>
    {view !== "day" && <>
      <div className="invitation-calendar-weekdays" aria-hidden="true">{weekdays.map(label => <span key={label}>{label}</span>)}</div>
      <ul className={`invitation-calendar-grid invitation-calendar-grid-${view}`} aria-label="Días del período">
        {days.map(date => {
          const events = grouped.get(date) ?? [];
          const tones = [...new Set(events.map(event => event.tone))];
          const videoCount = events.filter(event => event.tone === "blue" || event.tone === "violet").length;
          const invitationCount = events.length - videoCount;
          const countLabel = videoCount ? `${invitationCount} invitaciones y ${videoCount} ${videoCount === 1 ? "video" : "videos"}` : `${invitationCount} ${invitationCount === 1 ? "invitación" : "invitaciones"}`;
          return <li key={date} className="invitation-calendar-cell" data-outside={view === "month" && date.slice(0, 7) !== day.slice(0, 7)} data-selected={date === day}>
            <button type="button" className="invitation-calendar-day" aria-label={`${dayLabel.format(calendarDate(date))}, ${countLabel}`} aria-current={date === today ? "date" : undefined} aria-pressed={date === day} aria-haspopup="dialog" disabled={busy} onClick={() => onSelectDay(date)}>
              <span>{Number(date.slice(-2))}</span>
              {events.length > 0 && <span className="invitation-calendar-count" aria-hidden="true">{events.length}</span>}
              <span className="invitation-calendar-dots" aria-hidden="true">{tones.map(tone => <i key={tone} data-tone={tone} />)}</span>
            </button>
            {events.slice(0, 2).map(event => <button key={event.key} type="button" className="invitation-calendar-preview" data-tone={event.tone} disabled={busy} onClick={event.open} aria-label={`${event.name}, ${event.label}`}><span>{event.name}</span></button>)}
          </li>;
        })}
      </ul>
    </>}
    <div className="invitation-calendar-agenda">
      <div className="invitation-calendar-agenda-heading">
        <h3>{view === "day" ? "Agenda del día" : dayLabel.format(calendarDate(day))}</h3>
        {day >= today && <div className="invitation-calendar-create">
          <button className="authorization-button" type="button" disabled={busy} onClick={() => onCreate(day)}><Plus size={18} aria-hidden="true" /> Nueva invitación</button>
          {onSchedule && <button className="authorization-button authorization-button-secondary" type="button" disabled={busy} onClick={() => onSchedule(day)}><YoutubeLogo size={18} aria-hidden="true" /> Programar video de YouTube</button>}
        </div>}
      </div>
      {entries.length ? <ul className="invitation-calendar-entries" aria-label="Registros del día">
        {entries.map(entry => (
          <li key={entry.key}><button type="button" disabled={busy} onClick={entry.open}>
            <span><strong>{entry.name}</strong><span>{entry.description}</span></span>
            <span className="invitation-calendar-state" data-tone={entry.tone}>{entry.label}</span>
            <CaretRight size={17} aria-hidden="true" />
          </button></li>
        ))}
      </ul> : <p>Sin invitaciones ni videos para esta fecha.</p>}
    </div>
  </section>;
}
