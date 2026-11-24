import { useRef, useState, type ReactNode } from "react";
import { ArrowsClockwise, CalendarBlank, FileText, List, SignOut, Star, Users, X } from "@phosphor-icons/react";
import { AuthorizationBrand } from "./shell";

const sections = [
  { id: "calendar", label: "Calendario", heading: "Calendario", Icon: CalendarBlank },
  { id: "authorizations", label: "Participaciones", heading: "Participaciones", Icon: Users },
  { id: "documents", label: "Documentos", heading: "Documentos legales", Icon: FileText },
  { id: "reviews", label: "Reseñas", heading: "Reseñas", Icon: Star },
] as const;

export type AdminSection = typeof sections[number]["id"];

export function AdminWorkspace({ active, onNavigate, admin, busy, onRefresh, onSignOut, children }: {
  active: AdminSection;
  onNavigate: (section: AdminSection) => void;
  admin: { email: string; role: "admin" | "production" };
  busy: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const current = sections.find(section => section.id === active);

  return <div className="authorization-workspace">
    <aside className="authorization-workspace-sidebar" data-expanded={menuOpen} onKeyDown={event => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <div className="authorization-workspace-brand">
        <AuthorizationBrand />
        <button ref={menuButton} type="button" className="authorization-workspace-menu" aria-label={menuOpen ? "Cerrar menú del panel" : "Abrir menú del panel"} aria-expanded={menuOpen} aria-controls="authorization-workspace-navigation" onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={22} aria-hidden="true" /> : <List size={22} aria-hidden="true" />}
        </button>
      </div>
      <div id="authorization-workspace-navigation" className="authorization-workspace-navigation">
        <nav className="authorization-workspace-links" aria-label="Secciones del panel">
          {sections.filter(section => section.id !== "reviews" || admin.role === "admin").map(({ id, label, Icon }) => (
            <button key={id} type="button" aria-current={active === id ? "page" : undefined} onClick={() => {
              onNavigate(id);
              if (menuOpen) menuButton.current?.focus();
              setMenuOpen(false);
            }}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <div className="authorization-workspace-account">
          <p>{admin.email}</p>
          {active !== "reviews" && <button type="button" disabled={busy} onClick={onRefresh}><ArrowsClockwise size={17} aria-hidden="true" /> Actualizar</button>}
          <button type="button" disabled={busy} onClick={onSignOut}><SignOut size={17} aria-hidden="true" /> Salir</button>
        </div>
      </div>
    </aside>
    <div className="authorization-workspace-content">
      {active !== "calendar" && <h1 className="authorization-workspace-title">{current?.heading}</h1>}
      {children}
    </div>
  </div>;
}
