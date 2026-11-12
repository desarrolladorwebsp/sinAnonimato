"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { reviewPlatforms, type Review, type ReviewPlatform } from "@/lib/review-types";
import { authorizationApi } from "./guest-flow";

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [platform, setPlatform] = useState<ReviewPlatform>("Instagram");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const flight = useRef(false);

  useEffect(() => {
    let active = true;
    void authorizationApi("admin/reviews")
      .then((items: Review[]) => { if (active) setReviews(items); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las reseñas.");
      });
    return () => { active = false; };
  }, []);

  async function act(work: () => Promise<void>, success: string) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el cambio.");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    void act(async () => {
      const review: Review = await authorizationApi("admin/reviews", { ...data, action: "add" });
      setReviews(items => [review, ...(items ?? [])]);
      form.reset();
      setPlatform("Instagram");
    }, "Reseña publicada en el sitio.");
  }

  function remove(id: string) {
    void act(async () => {
      await authorizationApi("admin/reviews", { action: "delete", id });
      setReviews(items => items?.filter(item => item.id !== id) ?? null);
      setPendingDelete(null);
    }, "Reseña eliminada del sitio.");
  }

  return (
    <section className="authorization-editor" aria-labelledby="admin-reviews-title">
      <h2 id="admin-reviews-title">Reseñas de la comunidad</h2>
      <p>Copia el comentario original y el nombre con el que debe aparecer. Al publicarlo se mostrará en la portada.</p>
      {error && <p className="authorization-alert" role="alert">{error}</p>}
      <p role="status" className={message ? "authorization-notice" : "sr-only"}>{message}</p>
      {reviews === null ? (
        !error && <p role="status">Cargando reseñas…</p>
      ) : (
        <div className="review-admin-grid">
          <form className="authorization-form" method="post" onSubmit={submit} aria-label="Agregar reseña">
            <label>Nombre visible<input name="author" required maxLength={80} /></label>
            <label>Plataforma
              <select name="platform" value={platform} onChange={event => setPlatform(event.target.value as ReviewPlatform)}>
                {reviewPlatforms.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label>Comentario<textarea name="comment" rows={4} required maxLength={500} /></label>
            {platform !== "Comunidad" && <label>Enlace a la publicación original (opcional)
              <input name="sourceUrl" type="url" maxLength={1000} placeholder="https://" />
            </label>}
            <button className="authorization-button" disabled={busy} type="submit">Publicar reseña</button>
          </form>
          <div>
            <h3 className="font-bold">Reseñas publicadas ({reviews.length})</h3>
            {reviews.length === 0 ? <p className="authorization-help mt-3">Aún no hay reseñas publicadas.</p> : (
              <ul className="review-admin-list">
                {reviews.map(review => (
                  <li key={review.id}>
                    <strong>{review.author}</strong>
                    <span className="authorization-help"> · {review.platform}</span>
                    <p className="my-2 text-sm">{review.comment}</p>
                    {pendingDelete === review.id ? (
                      <div className="authorization-actions">
                        <button className="authorization-button" type="button" disabled={busy} onClick={() => remove(review.id)}>Confirmar eliminación</button>
                        <button className="authorization-text-button" type="button" disabled={busy} onClick={() => setPendingDelete(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <button className="authorization-text-button" type="button" disabled={busy}
                        aria-label={`Eliminar reseña de ${review.author}`} onClick={() => setPendingDelete(review.id)}>Eliminar reseña</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
