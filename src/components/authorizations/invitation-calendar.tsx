import { useEffect, useState, useSyncExternalStore } from "react";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import { calendarDate, calendarDay, shiftCalendarDay } from "@/lib/authorizations/calendar-dates";
import type { Authorization } from "@/lib/authorizations/types";
import type { ScheduledEpisode } from "@/lib/episode";

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
type CalendarEntry = {
  key: string;
  name: string;
  description: string;
  label: string;
  tone: Tone;
  publishAt?: string;
  open: () => void;
};

const modes: Record<View, string> = { month: "Mes", week: "Semana", day: "Día" };
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const monthLabel = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" });
const dayLabel = new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeZone: "UTC" });
const agendaDayLabel = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", timeZone: "UTC" });
const weekLabel = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const mobileViewport = "(max-width: 767px)";

function watchViewport(change: () => void) {
  const query = window.matchMedia?.(mobileViewport);
  query?.addEventListener("change", change);
  return () => query?.removeEventListener("change", change);
}

function isMobileViewport() {
  return window.matchMedia?.(mobileViewport).matches ?? false;
}

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

export function InvitationCalendar<Row extends CalendarInvitation>({ rows, episodes, day, onChangeDay, onSelectDay, onDetail, onEpisode, busy }: {
  rows: Row[];
  episodes: ScheduledEpisode[];
  day: string;
  onChangeDay: (day: string) => void;
  onSelectDay: (day: string) => void;
  onDetail: (row: Row) => void;
  onEpisode: (episode: ScheduledEpisode) => void;
  busy: boolean;
}) {
  const mobile = useSyncExternalStore(watchViewport, isMobileViewport, () => false);
  const [chosenView, setView] = useState<View | null>(null);
  const view = chosenView ?? (mobile ? "week" : "month");
  const weekStrip = mobile && view === "week";
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
  for (const episode of [...episodes].sort((a, b) => a.publishAt.localeCompare(b.publishAt))) {
    addEntry(episode.publishAt, {
      key: `episode-${episode.youtubeId}`,
      name: episode.title,
      description: episode.format === "short" ? "Short vertical" : "Capítulo completo",
      label: episode.removedAt ? "Retirado" : Date.parse(episode.publishAt) > now ? "Programado" : episode.available ? "Publicado en el sitio" : "Pendiente en YouTube",
      tone: episode.format === "short" ? "violet" : "blue",
      publishAt: episode.publishAt,
      open: () => onEpisode(episode),
    });
  }
  for (const row of rows) {
    addEntry(row.recordingAt, { key: row.id, name: row.name, description: row.episode, ...invitationStatus(row, now), open: () => onDetail(row) });
  }
  const entries = grouped.get(day) ?? [];
  const recordings = entries.filter(entry => !entry.publishAt);
  const videos = entries.filter(entry => entry.publishAt);
  const title = view === "month" ? monthLabel.format(calendarDate(day)) : view === "week"
    ? weekLabel.formatRange(calendarDate(start), calendarDate(shiftCalendarDay(end, -1)))
    : dayLabel.format(calendarDate(day));

  function navigate(amount: number) {
    onChangeDay(view === "month" ? shiftMonth(day, amount) : shiftCalendarDay(day, amount * (view === "week" ? 7 : 1)));
  }

  return <section className="invitation-calendar" aria-label="Calendario de grabaciones y publicaciones">
    <div className="invitation-calendar-heading">
      <h1>{mobile ? "Agenda" : "Calendario"}</h1>
      <button className="authorization-button" type="button" aria-haspopup="dialog" disabled={busy} onClick={() => onSelectDay(day)}>
        <Plus size={18} aria-hidden="true" /> Agregar
      </button>
    </div>
    <div className="invitation-calendar-modes" aria-label="Vista del calendario" role="group">
      {(Object.keys(modes) as View[]).map(mode => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)}>{modes[mode]}</button>)}
    </div>
    <div className="invitation-calendar-layout" data-view={view}>
      <div className="invitation-calendar-period">
        <div className="invitation-calendar-toolbar" aria-label="Navegación del calendario" role="group">
          <button type="button" aria-label="Período anterior" onClick={() => navigate(-1)}><CaretLeft size={18} aria-hidden="true" /></button>
          <h2 aria-live="polite">{title}</h2>
          <button type="button" className="invitation-calendar-today" onClick={() => { const current = Date.now(); setNow(current); onChangeDay(calendarDay(new Date(current))); }}>Hoy</button>
          <button type="button" aria-label="Período siguiente" onClick={() => navigate(1)}><CaretRight size={18} aria-hidden="true" /></button>
        </div>

        {view !== "day" && <ul className={`invitation-calendar-grid invitation-calendar-grid-${view}`} aria-label="Días del período">
          {!weekStrip && weekdays.map(label => <li className="invitation-calendar-weekday" key={label} aria-hidden="true">{label}</li>)}
          {days.map((date, index) => {
            const events = grouped.get(date) ?? [];
            const tones = [...new Set(events.map(event => event.tone))];
            const videoCount = events.filter(event => event.publishAt).length;
            const invitationCount = events.length - videoCount;
            const countLabel = `${invitationCount} ${invitationCount === 1 ? "invitación" : "invitaciones"}${videoCount ? ` y ${videoCount} ${videoCount === 1 ? "video" : "videos"}` : ""}`;
            return <li key={date} className="invitation-calendar-cell" data-outside={view === "month" && date.slice(0, 7) !== day.slice(0, 7)} data-selected={date === day}>
              <button type="button" className="invitation-calendar-day" aria-label={`${dayLabel.format(calendarDate(date))}, ${countLabel}`} aria-current={date === today ? "date" : undefined} aria-pressed={date === day} aria-haspopup={weekStrip ? undefined : "dialog"} disabled={busy} onClick={() => weekStrip ? onChangeDay(date) : onSelectDay(date)}>
                {weekStrip && <span className="invitation-calendar-day-label" aria-hidden="true">{weekdays[index]}</span>}
                <span className="invitation-calendar-day-number">{Number(date.slice(-2))}</span>
                <span className="invitation-calendar-dots" aria-hidden="true">{tones.map(tone => <i key={tone} data-tone={tone} />)}</span>
              </button>
              {!weekStrip && events.slice(0, 2).map(event => <button key={event.key} type="button" className="invitation-calendar-preview" data-tone={event.tone} disabled={busy} onClick={event.open} aria-label={`${event.name}, ${event.label}`}><span>{event.name}</span></button>)}
            </li>;
          })}
        </ul>}
      </div>
      <div className="invitation-calendar-agenda">
        <h2>{agendaDayLabel.format(calendarDate(day))}</h2>
        <ul className="invitation-calendar-entries" aria-label="Registros del día">
          <AgendaGroup title="Grabaciones" entries={recordings} empty="Sin grabaciones este día." busy={busy} />
          <AgendaGroup title="Publicaciones" entries={videos} empty="Sin publicaciones programadas." busy={busy} />
        </ul>
      </div>
    </div>
    {view !== "day" && <ul className="invitation-calendar-legend" aria-label="Estados del calendario">
      <li data-tone="green">Aceptadas</li>
      <li data-tone="yellow">Pendientes</li>
      <li data-tone="red">Rechazadas, anuladas o vencidas</li>
      <li data-tone="blue">Capítulos</li>
      <li data-tone="violet">Shorts</li>
    </ul>}
  </section>;
}

function AgendaGroup({ title, entries, empty, busy }: { title: string; entries: CalendarEntry[]; empty: string; busy: boolean }) {
  return <li className="invitation-calendar-group">
    <h3>{title}</h3>
    {entries.length > 0 ? <ul>
      {entries.map(entry => <li className="invitation-calendar-entry" key={entry.key}>
        <button type="button" disabled={busy} onClick={entry.open} data-tone={entry.tone}>
          <span className="invitation-calendar-dot" aria-hidden="true" />
          <span className="invitation-calendar-entry-text">
            <strong>{entry.name}</strong>
            <span>{entry.publishAt && <><time dateTime={entry.publishAt}>{clock.format(new Date(entry.publishAt))}</time> · </>}{entry.description}</span>
          </span>
          <span className="invitation-calendar-state" data-tone={entry.tone}>{entry.label}</span>
          <CaretRight size={16} aria-hidden="true" />
        </button>
      </li>)}
    </ul> : <p>{empty}</p>}
  </li>;
}
