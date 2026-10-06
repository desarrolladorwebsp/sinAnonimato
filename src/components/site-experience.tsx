"use client";

import { ArrowUpRight, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const panels = {
  "#quienes-somos": {
    eyebrow: "Quiénes somos",
    title: "Historias reales. Voces que importan.",
    copy: "Sin Anonimato es un espacio para escuchar, visibilizar y dar voz a las historias que importan. Tu historia puede hacer la diferencia.",
  },
  "#historias": {
    eyebrow: "Historias",
    title: "Próximamente, historias que merecen ser escuchadas.",
    copy: "Muy pronto compartiremos nuestras historias. Si tienes una historia que contar, queremos escucharte.",
  },
} as const;

type PanelKey = keyof typeof panels;

export function SiteExperience({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<PanelKey>("#quienes-somos");

  useEffect(() => {
    function navigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const href = link?.getAttribute("href");
      if (!href) return;
      if (href in panels) {
        event.preventDefault();
        setPanel(href as PanelKey);
        dialog.current?.showModal();
        return;
      }
      const target = document.getElementById(href.slice(1));
      if (target) {
        event.preventDefault();
        dialog.current?.close();
        target.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        history.replaceState(null, "", href);
      }
    }
    document.addEventListener("click", navigate);
    return () => document.removeEventListener("click", navigate);
  }, []);

  const content = panels[panel];
  return (
    <>
      {children}
      <dialog
        ref={dialog}
        className="info-dialog"
        aria-labelledby="info-title"
        aria-describedby="info-copy"
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      >
        <div className="info-dialog-content">
          <button className="info-close" type="button" aria-label="Cerrar panel" onClick={() => dialog.current?.close()}><X size={22} /></button>
          <p className="section-eyebrow">{content.eyebrow}</p>
          <h2 id="info-title">{content.title}</h2>
          <p id="info-copy">{content.copy}</p>
          <a className="editorial-link" href="#contacto">Cuéntanos tu historia <ArrowUpRight size={20} aria-hidden="true" /></a>
        </div>
      </dialog>
    </>
  );
}
