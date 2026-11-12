import { randomUUID } from "node:crypto";
import { AuthorizationError } from "@/lib/authorizations/config";
import type { Connection } from "@/lib/authorizations/db";
import { text, uuid } from "@/lib/authorizations/validation";
import { reviewPlatforms, type Review, type ReviewPlatform } from "@/lib/review-types";

const socialDomains = {
  Instagram: ["instagram.com", "www.instagram.com"],
  YouTube: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
};

export async function listReviews(db: Connection) {
  const { rows } = await db.query<Review>(`
    SELECT id, author, platform, comment, source_url AS "sourceUrl"
    FROM sa_reviews
    ORDER BY created_at DESC, id DESC
  `);
  return rows;
}

export async function addReview(db: Connection, input: Record<string, unknown>): Promise<Review> {
  const { platform } = input;
  if (!reviewPlatforms.some(value => value === platform)) {
    throw new AuthorizationError(400, "Selecciona una plataforma válida.");
  }
  const source = platform as ReviewPlatform;
  const review: Review = {
    id: randomUUID(),
    author: text(input.author, "el nombre visible", 80),
    platform: source,
    comment: text(input.comment, "el comentario", 500),
    sourceUrl: parseSourceUrl(input.sourceUrl, source),
  };
  await db.query(
    "INSERT INTO sa_reviews (id, author, platform, comment, source_url) VALUES ($1, $2, $3, $4, $5)",
    [review.id, review.author, review.platform, review.comment, review.sourceUrl],
  );
  return review;
}

function parseSourceUrl(value: unknown, platform: ReviewPlatform) {
  if (value == null || value === "") return null;
  const url = URL.parse(text(value, "el enlace original", 1000));
  if (
    platform === "Comunidad" || !url || url.protocol !== "https:" ||
    url.username || url.password || url.port ||
    !socialDomains[platform].includes(url.hostname) || url.pathname === "/" ||
    url.href.length > 1000
  ) {
    throw new AuthorizationError(400, "Usa un enlace HTTPS de la plataforma seleccionada.");
  }
  return url.href;
}

export async function deleteReview(db: Connection, id: unknown) {
  const result = await db.query("DELETE FROM sa_reviews WHERE id = $1", [uuid(id)]);
  if (!result.rowCount) throw new AuthorizationError(404, "Esta reseña ya no está disponible.");
}
