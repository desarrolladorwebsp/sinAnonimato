export const reviewPlatforms = ["Instagram", "YouTube", "Comunidad"] as const;
export type ReviewPlatform = typeof reviewPlatforms[number];

export type Review = {
  id: string;
  author: string;
  platform: ReviewPlatform;
  comment: string;
  sourceUrl: string | null;
};
