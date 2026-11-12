"use client";

import { StreamReveal } from "./stream-reveal";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { SponsorForm } from "@/components/sponsor-form";

const sponsors = [
  {
    name: "Isapres Premium",
    logo: "isapres-premium.webp",
    image: "santiago.webp",
    description: "Explora opciones de planes de salud.",
    href: "https://www.isaprespremium.cl/",
  },
  {
    name: "Cotízalo Antes",
    logo: "cotizalo-antes.avif",
    image: "comparar.webp",
    description: "Compara opciones antes de elegir.",
    href: "https://www.cotizaloantes.cl/",
  },
];
const imageFolder = "/images/auspiciadores/";
const rotationMs = 6500;

export function SponsorSection() {
  const gallery = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const rotating = visible && !paused && !hovered && !focused && !reduceMotion;
  const sponsor = sponsors[active];
  const next = sponsors[(active + 1) % sponsors.length];

  useEffect(() => {
    const element = gallery.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.45 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setDirection("forward");
      setActive((index) => (index + 1) % sponsors.length);
    }, rotationMs);
    return () => window.clearInterval(timer);
  }, [active, rotating]);

  function step(offset: number) {
    setDirection(offset < 0 ? "back" : "forward");
    setActive((index) => (index + offset + sponsors.length) % sponsors.length);
  }

  return (
    <section id="auspiciadores" className="sponsor-section" aria-labelledby="sponsor-title">
      <StreamReveal className="podcast-wrap">
        <h2 id="sponsor-title" className="section-eyebrow sponsor-ad-label">Espacio publicitario</h2>
        <div
          ref={gallery}
          className="sponsor-gallery"
          data-direction={direction}
          onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
          onKeyDown={(event) => {
            if (event.target instanceof HTMLAnchorElement) return;
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            step(event.key === "ArrowLeft" ? -1 : 1);
          }}
        >
          <div
            className="sponsor-gallery-stage"
            onTouchStart={(event) => {
              const { clientX: x, clientY: y } = event.touches[0];
              touchStart.current = { x, y };
              swiped.current = false;
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              touchStart.current = null;
              if (!start) return;
              const { clientX: x, clientY: y } = event.changedTouches[0];
              const dx = x - start.x;
              if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(y - start.y)) return;
              swiped.current = true;
              step(dx < 0 ? 1 : -1);
            }}
            onClickCapture={(event) => {
              if (!swiped.current) return;
              swiped.current = false;
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <a key={sponsor.name} className="sponsor-gallery-ad" href={sponsor.href} aria-label={`Conocer más sobre ${sponsor.name}`}>
              <Image src={imageFolder + sponsor.image} alt="" fill unoptimized sizes="(max-width: 767px) 85vw, 900px" className="sponsor-gallery-photo" />
              <span className="sponsor-gallery-copy">
                <span className="sponsor-gallery-brand">
                  <span className="sponsor-gallery-logo">
                    <Image src={imageFolder + sponsor.logo} alt="" fill unoptimized sizes="128px" className="object-contain" />
                  </span>
                  <span className="sponsor-gallery-name">{sponsor.name}</span>
                </span>
                <span className="sponsor-gallery-description">{sponsor.description}</span>
                <span className="sponsor-gallery-link">Conocer más <span aria-hidden="true">↗</span></span>
              </span>
            </a>
            <a key={next.name + "-preview"} className="sponsor-gallery-preview" href={next.href} aria-label={`Visitar ${next.name}`}>
              <Image src={imageFolder + next.image} alt="" fill unoptimized sizes="(max-width: 767px) 12vw, 340px" className="sponsor-gallery-photo" />
              <span><small>Siguiente</small>{next.name}</span>
            </a>
          </div>
          <div className="sponsor-gallery-controls">
            <button type="button" onClick={() => step(-1)} aria-label="Anuncio anterior">←</button>
            <div className="sponsor-gallery-pages">
              {!reduceMotion && (
                <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Reanudar rotación automática" : "Pausar rotación automática"}>
                  <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
                </button>
              )}
              {sponsors.map(({ name }, index) => (
                <button key={name} type="button" className="sponsor-gallery-dot" aria-label={`Mostrar anuncio de ${name}`} aria-current={active === index ? "true" : undefined} onClick={() => step(index - active)}>
                  <span />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => step(1)} aria-label="Anuncio siguiente">→</button>
          </div>
        </div>
        <section aria-labelledby="sponsor-invitation-title">
          <div className="sponsor-invitation">
            <span className="sponsor-studio-label">Desde el estudio</span>
            <div className="sponsor-invitation-copy">
              <p className="section-eyebrow">Auspicia Sin Anonimato</p>
              <h2 id="sponsor-invitation-title">Dale voz a las historias que importan.</h2>
              <p>Invitamos a marcas y empresas a ser parte del podcast y a apoyar las conversaciones que merecen ser escuchadas.</p>
              <SponsorForm />
            </div>
          </div>
          <div className="sponsor-brands">
            <h3>Marcas que nos acompañan</h3>
            <ul className="sponsor-brands-list">
              {sponsors.map(({ name, logo, href }) => (
                <li key={name}>
                  <a href={href}>
                    <Image src={imageFolder + logo} alt={name} fill unoptimized sizes="(max-width: 480px) 40vw, 190px" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </StreamReveal>
    </section>
  );
}
