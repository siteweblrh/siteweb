import { z } from "zod";

export const SocialLinkSchema = z.object({
  label: z.string().min(1).max(40),
  url: z.string().url().max(500),
});

export type ClubSocialLink = z.infer<typeof SocialLinkSchema>;

/** Parse the JSON socials column into a typed array, ignoring invalid entries. */
export function parseSocials(raw: unknown): ClubSocialLink[] {
  if (!Array.isArray(raw)) return [];
  const out: ClubSocialLink[] = [];
  for (const item of raw) {
    const parsed = SocialLinkSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
