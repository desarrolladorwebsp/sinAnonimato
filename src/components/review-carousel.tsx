"use client";

import { ArrowLeft, ArrowRight, ChatCircleDots, InstagramLogo, Quotes, YoutubeLogo } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Review } from "@/lib/review-types";
import { StreamReveal } from "@/components/stream-reveal";

const platformIcons = { Instagram: InstagramLogo, YouTube: YoutubeLogo, Comunidad: ChatCircleDots };

const sampleReviews: Review[] = [
  { id: "example-1", author: "Camila R.", platform: "Comunidad", sourceUrl: null, comment: "El capítulo de artistas callejeros me hizo mirar de otra forma a quienes llenan de música la ciudad." },
  { id: "example-2", author: "Diego M.", platform: "Comunidad", sourceUrl: null, comment: "Me gustó que dejaran espacio para escuchar la historia completa. La conversación se sintió cercana." },
  { id: "example-3", author: "Valentina S.", platform: "Comunidad", sourceUrl: null, comment: "Pensé que iba a ver solo un rato y terminé el capítulo entero. Me quedé con ganas de escuchar el siguiente." },
  { id: "example-4", author: "Javier P.", platform: "Comunidad", sourceUrl: null, comment: "Lo compartí con un amigo y terminamos conversando sobre cuánto trabajo hay detrás del arte que vemos en la calle." },
  { id: "example-5", author: "Antonia L.", platform: "Comunidad", sourceUrl: null, comment: "Me gustó el respeto con que hicieron las preguntas. Ojalá sigan dando espacio a historias así." },
];

function advance(track: HTMLUListElement, direction: 1 | -1, reducedMotion: boolean) {
  const [first, second] = Array.from(track.children) as HTMLElement[];
  const end = track.scrollWidth - track.clientWidth;
  if (!first || !second || end < 2) return;
  const step = second.offsetLeft - first.offsetLeft;
  const index = Math.round(track.scrollLeft / step);
  let target = Math.min(end, Math.max(0, (index + direction) * step));
  if (direction === 1 && track.scrollLeft >= end - 2) target = 0;
  if (direction === -1 && track.scrollLeft <= 2) target = end;
  track.scrollTo({ left: target, behavior: reducedMotion ? "instant" : "smooth" });
}

export function ReviewCarousel({ reviews, examples = false }: { reviews: Review[]; examples?: boolean }) {
  const track = useRef<HTMLUListElement>(null);
  const lastInteraction = useRef(0);
  const [canScroll, setCanScroll] = useState(false);
  const reviewCount = reviews.length;

  useEffect(() => {
    const list = track.current;
    if (!list) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (location.hash === "#resenas") list.closest("section")?.scrollIntoView({ behavior: "instant" });
    const resize = new ResizeObserver(() => setCanScroll(list.scrollWidth - list.clientWidth > 2));
    resize.observe(list);

    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.2 });
    observer.observe(list);
    const interval = window.setInterval(() => {
      if (visible && Date.now() - lastInteraction.current > 12000 && !motion.matches && !document.hidden &&
          !list.closest("section")?.matches(":hover, :focus-within")) {
        advance(list, 1, false);
      }
    }, 5200);
    return () => {
      resize.disconnect();
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [reviewCount]);

  function navigate(direction: 1 | -1) {
    lastInteraction.current = Date.now();
    if (track.current) advance(track.current, direction, matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  return (
    <section id="resenas" className="reviews-section" aria-labelledby="reviews-title">
      <div className="podcast-wrap">
        <div className="reviews-heading">
          <div>
            <p className="section-eyebrow">Voces de la comunidad</p>
            <h2 id="reviews-title" className="podcast-section-title">Historias que dejan huella.</h2>
          </div>
          {reviews.length > 0 && canScroll && <div className="reviews-controls">
            <button type="button" aria-label="Reseña anterior" aria-controls="reviews-track" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label="Reseña siguiente" aria-controls="reviews-track" onClick={() => navigate(1)}>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>}
        </div>
        {reviews.length === 0 ? (
          <div className="reviews-empty" role="status">
            <div className="reviews-empty-mark" aria-hidden="true"><ChatCircleDots size={29} /></div>
            <div>
              <p className="reviews-empty-title">La conversación también sigue aquí.</p>
              <p className="reviews-empty-copy">Pronto compartiremos opiniones reales de quienes nos escuchan, desde Instagram, YouTube y nuestra comunidad.</p>
            </div>
            <div className="reviews-empty-platforms" aria-label="Instagram, YouTube y comunidad">
              <span><InstagramLogo size={17} aria-hidden="true" /> Instagram</span>
              <span><YoutubeLogo size={17} aria-hidden="true" /> YouTube</span>
              <span><ChatCircleDots size={17} aria-hidden="true" /> Comunidad</span>
            </div>
          </div>
        ) : <ul
          id="reviews-track"
          ref={track}
          className="reviews-track"
          aria-label="Comentarios de la comunidad"
          tabIndex={canScroll ? 0 : undefined}
          onPointerDown={() => { lastInteraction.current = Date.now(); }}
          onKeyDown={event => {
            if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
            event.preventDefault();
            navigate(event.key === "ArrowLeft" ? -1 : 1);
          }}
        >
          {reviews.map((review, index) => {
            const Icon = platformIcons[review.platform];
            return (
              <StreamReveal as="li" key={review.id} className="review-card" index={index} direction={index % 2 ? "right" : "left"}>
                <figure>
                  <Quotes size={27} weight="fill" className="review-quote-mark" aria-hidden="true" />
                  <blockquote>“{review.comment}”</blockquote>
                  <figcaption>
                    {!examples && <span className="review-platform-icon"><Icon size={19} aria-hidden="true" /></span>}
                    <span>
                      <strong>{review.author}</strong>
                      {!examples && (review.sourceUrl
                        ? <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver comentario original de ${review.author} en ${review.platform}`}>{review.platform} ↗</a>
                        : <span className="review-platform-label">{review.platform}</span>)}
                    </span>
                  </figcaption>
                </figure>
              </StreamReveal>
            );
          })}
        </ul>}
      </div>
    </section>
  );
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/authorizations/public/reviews", { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() : [])
      .then((data: Review[]) => { if (!controller.signal.aborted && Array.isArray(data)) setReviews(data); })
      .catch(() => { /* Reviews are optional on the public page. */ });
    return () => controller.abort();
  }, []);
  return <ReviewCarousel reviews={reviews.length > 0 ? reviews : sampleReviews} examples={reviews.length === 0} />;
}
