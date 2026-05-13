export const NEWS_CATEGORY_VALUES = ["ACTUALITE", "RESULTAT", "EVENEMENT", "COMMUNIQUE"] as const;

export type NewsCategory = (typeof NEWS_CATEGORY_VALUES)[number];

type CategoryMeta = {
  value: NewsCategory;
  label: string;
  bg: string;
  fg: string;
};

export const NEWS_CATEGORIES: CategoryMeta[] = [
  { value: "ACTUALITE",   label: "Actualité",  bg: "#002244", fg: "#FFE07A" },
  { value: "RESULTAT",    label: "Résultat",   bg: "#A8202F", fg: "#FFFFFF" },
  { value: "EVENEMENT",   label: "Événement",  bg: "#F3BC1C", fg: "#002244" },
  { value: "COMMUNIQUE",  label: "Communiqué", bg: "#1F2937", fg: "#FFFFFF" },
];

const META_BY_VALUE = new Map(NEWS_CATEGORIES.map((c) => [c.value, c]));

export function getCategoryMeta(value: string): CategoryMeta {
  return META_BY_VALUE.get(value as NewsCategory) ?? NEWS_CATEGORIES[0];
}

export function isNewsCategory(value: string | undefined | null): value is NewsCategory {
  return !!value && META_BY_VALUE.has(value as NewsCategory);
}
