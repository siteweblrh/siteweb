# Blog Module — Template réutilisable (Next.js App Router)

> Stack de référence : **Next.js 15+ App Router · React 19 · TypeScript · Tailwind CSS v4 · Prisma 5 · PostgreSQL**  
> Ce document est indépendant du projet d'origine. Il documente le pattern complet pour intégrer un blog administrable dans n'importe quelle landing page.

---

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Modèle de données (Prisma)](#2-modèle-de-données-prisma)
3. [Structure de fichiers](#3-structure-de-fichiers)
4. [Server Actions (CRUD)](#4-server-actions-crud)
5. [Pages publiques](#5-pages-publiques)
6. [Pages admin](#6-pages-admin)
7. [Composants publics](#7-composants-publics)
8. [Composants admin](#8-composants-admin)
9. [Utilitaires](#9-utilitaires)
10. [Authentification & sécurité](#10-authentification--sécurité)
11. [SEO & métadonnées](#11-seo--métadonnées)
12. [Flux RSS & sitemap](#12-flux-rss--sitemap)
13. [Upload d'images (Cloudinary)](#13-upload-dimages-cloudinary)
14. [Éditeur de texte riche (TipTap)](#14-éditeur-de-texte-riche-tiptap)
15. [Performance & cache](#15-performance--cache)
16. [Variables d'environnement requises](#16-variables-denvironnement-requises)
17. [Checklist d'intégration](#17-checklist-dintégration)

---

## 1. Architecture globale

```
Requête utilisateur
       │
       ▼
  Next.js App Router
  ┌────────────────────────────────────────────┐
  │  Route publique       Route admin          │
  │  /blog                /dashboard/blog      │
  │  /blog/[slug]         /dashboard/blog/new  │
  │                       /dashboard/blog/[id] │
  └────────────────────────────────────────────┘
       │                        │
       ▼                        ▼
  Server Component         Server Action
  (ISR 60s)                (requireAdmin → DB)
       │                        │
       ▼                        ▼
  Prisma (PostgreSQL)  ←────────┘
  (Neon / Supabase / Railway)
```

**Principes de conception :**
- **Rendu serveur par défaut** — les pages publiques sont des Server Components avec ISR.
- **Server Actions uniquement** — pas d'API Route pour les mutations ; la sécurité est centralisée dans l'action.
- **Client Components limités** — uniquement pour la recherche/filtre, l'éditeur et les interactions UI.
- **Pas de dépendances inutiles** — pas de Redux, SWR ou React Query ; les Server Actions suffisent.

---

## 2. Modèle de données (Prisma)

```prisma
// prisma/schema.prisma

model Post {
  id              String    @id @default(cuid())
  title           String
  slug            String    @unique
  content         String    // HTML sanitisé
  excerpt         String?   // Résumé auto ou manuel (max 300 chars)
  metaDescription String?   // Pour SEO (max 160 chars)
  tag             String    @default("general")
  coverImage      String?   // URL Cloudinary ou autre CDN
  published       Boolean   @default(false)
  publishedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([published, publishedAt]) // Index pour les requêtes publiques
  @@index([slug])
}
```

**Notes :**
- `slug` : unique, généré depuis le titre (dé-accentuement + kebab-case).
- `published` + `publishedAt` : permet les articles programmatiques (draft → publié à date).
- `excerpt` : optionnel — sinon généré dynamiquement depuis `content`.
- Pas de modèle `Author` si blog mono-auteur ; ajouter une relation si multi-auteurs.

**Migration :**
```bash
npx prisma db push           # développement rapide (sans migration)
npx prisma migrate dev       # production (avec historique de migration)
```

---

## 3. Structure de fichiers

```
app/
├── (public)/
│   └── blog/
│       ├── page.tsx                    # Liste des articles (filtre, recherche)
│       └── [slug]/
│           ├── page.tsx                # Article complet
│           └── opengraph-image.tsx     # OG image dynamique (Next.js ImageResponse)
├── (admin)/
│   └── dashboard/
│       └── blog/
│           ├── page.tsx                # Liste admin (table)
│           ├── new/
│           │   └── page.tsx            # Formulaire création
│           └── [id]/
│               └── page.tsx            # Formulaire édition
├── feed.xml/
│   └── route.ts                        # Flux RSS 2.0
└── sitemap.ts                          # Sitemap dynamique

actions/
├── blog.actions.ts                     # CRUD admin (protected)
└── blog-public.actions.ts              # Lectures publiques (noStore)

components/
├── blog/
│   ├── BlogGrid.tsx                    # Grille d'articles + filtres client
│   ├── ArticleCard.tsx                 # Carte article
│   ├── ArticleContent.tsx              # Rendu HTML sanitisé
│   └── ShareButtons.tsx                # Boutons partage réseaux sociaux
└── admin/
    ├── PostForm.tsx                    # Formulaire création/édition
    ├── PostsTable.tsx                  # Tableau de gestion
    ├── PostPreview.tsx                 # Modal aperçu
    └── RichTextEditor.tsx              # Éditeur TipTap

lib/
└── blog-utils.ts                       # slugify, strip, tags, couleurs, temps de lecture
```

---

## 4. Server Actions (CRUD)

### 4.1 Actions admin (`actions/blog.actions.ts`)

```typescript
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Helper de sécurité — à appeler en tête de chaque mutation
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé");
  // Optionnel : vérifier un rôle spécifique
  // if (session.user.role !== "admin") throw new Error("Accès refusé");
}

export async function createPost(data: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  metaDescription?: string | null;
  tag?: string;
  coverImage?: string | null;
  published?: boolean;
  publishedAt?: Date | null;
}) {
  await requireAdmin();

  const post = await prisma.post.create({ data });

  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  redirect(`/dashboard/blog`);
}

export async function updatePost(id: string, data: Partial<{
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  metaDescription?: string | null;
  tag?: string;
  coverImage?: string | null;
  published: boolean;
  publishedAt?: Date | null;
}>) {
  await requireAdmin();

  const post = await prisma.post.update({ where: { id }, data });

  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/");
}

export async function deletePost(id: string) {
  await requireAdmin();

  const post = await prisma.post.delete({ where: { id } });

  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/");
}

export async function togglePostPublished(id: string) {
  await requireAdmin();

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new Error("Article introuvable");

  const updated = await prisma.post.update({
    where: { id },
    data: {
      published: !post.published,
      publishedAt: !post.published ? new Date() : post.publishedAt,
    },
  });

  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${updated.slug}`);
  revalidatePath("/");
}

// Lecture admin (avec brouillons)
export async function getAdminPosts() {
  await requireAdmin();
  return prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, tag: true, published: true, publishedAt: true, createdAt: true },
  });
}

export async function getAdminPost(id: string) {
  await requireAdmin();
  return prisma.post.findUnique({ where: { id } });
}
```

### 4.2 Actions publiques (`actions/blog-public.actions.ts`)

```typescript
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getPublishedPosts(options?: { limit?: number; tag?: string }) {
  noStore(); // Désactive le cache statique — ou utiliser unstable_cache pour ISR
  return prisma.post.findMany({
    where: {
      published: true,
      ...(options?.tag ? { tag: options.tag } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: options?.limit,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true, // pour générer excerpt si null
      tag: true,
      coverImage: true,
      publishedAt: true,
    },
  });
}

export async function getPostBySlug(slug: string) {
  noStore();
  return prisma.post.findFirst({
    where: { slug, published: true },
  });
}
```

> **Pourquoi `noStore()` sur les lectures publiques ?**  
> Garantit que les nouveaux articles publiés apparaissent sans redéploiement. Combiner avec `revalidate: 60` sur la page pour un comportement ISR.

---

## 5. Pages publiques

### 5.1 Liste des articles (`app/(public)/blog/page.tsx`)

```typescript
import { getPublishedPosts } from "@/actions/blog-public.actions";
import BlogGrid from "@/components/blog/BlogGrid";
import type { Metadata } from "next";

export const revalidate = 60; // ISR : revalider toutes les 60 secondes

export const metadata: Metadata = {
  title: "Blog | Mon Site",
  description: "Retrouvez nos derniers articles et actualités.",
};

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return (
    <main>
      <h1>Actualités</h1>
      <BlogGrid posts={posts} />
    </main>
  );
}
```

### 5.2 Article individuel (`app/(public)/blog/[slug]/page.tsx`)

```typescript
import { getPostBySlug, getPublishedPosts } from "@/actions/blog-public.actions";
import ArticleContent from "@/components/blog/ArticleContent";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

// Pré-générer les slugs connus au build
export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} | Mon Site`,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.metaDescription ?? post.excerpt ?? undefined,
      images: post.coverImage ? [{ url: post.coverImage }] : [],
    },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();
  return <ArticleContent post={post} />;
}
```

---

## 6. Pages admin

### 6.1 Protection des routes admin

**Middleware (`middleware.ts`) :**
```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith("/dashboard");
  if (isAdmin && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

### 6.2 Formulaire création (`app/(admin)/dashboard/blog/new/page.tsx`)

```typescript
import PostForm from "@/components/admin/PostForm";

export default function NewPostPage() {
  return (
    <div>
      <h1>Nouvel article</h1>
      <PostForm />
    </div>
  );
}
```

### 6.3 Formulaire édition (`app/(admin)/dashboard/blog/[id]/page.tsx`)

```typescript
import { getAdminPost } from "@/actions/blog.actions";
import PostForm from "@/components/admin/PostForm";
import { notFound } from "next/navigation";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const post = await getAdminPost(params.id);
  if (!post) notFound();
  return (
    <div>
      <h1>Modifier l'article</h1>
      <PostForm post={post} />
    </div>
  );
}
```

---

## 7. Composants publics

### 7.1 BlogGrid (client — filtre instantané)

```typescript
"use client";

import { useState, useMemo } from "react";
import ArticleCard from "./ArticleCard";
import { POST_TAGS } from "@/lib/blog-utils";

type Post = {
  id: string; title: string; slug: string;
  excerpt?: string | null; content: string;
  tag: string; coverImage?: string | null; publishedAt?: Date | null;
};

export default function BlogGrid({ posts }: { posts: Post[] }) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("all");

  const filtered = useMemo(() =>
    posts.filter((p) => {
      const matchTag = activeTag === "all" || p.tag === activeTag;
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      return matchTag && matchSearch;
    }),
    [posts, search, activeTag]
  );

  return (
    <div>
      {/* Barre de recherche */}
      <input
        type="search"
        placeholder="Rechercher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filtres par tag */}
      <div>
        <button onClick={() => setActiveTag("all")}>Tous</button>
        {POST_TAGS.map((t) => (
          <button key={t.value} onClick={() => setActiveTag(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => <ArticleCard key={p.id} post={p} />)}
      </div>

      {filtered.length === 0 && <p>Aucun article trouvé.</p>}
    </div>
  );
}
```

### 7.2 ArticleContent (rendu HTML sanitisé)

```typescript
import { sanitizeContent } from "@/lib/blog-utils";

export default function ArticleContent({ post }: { post: Post }) {
  const clean = sanitizeContent(post.content);
  return (
    <article>
      <h1>{post.title}</h1>
      {/* dangerouslySetInnerHTML uniquement sur contenu sanitisé côté serveur */}
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </article>
  );
}
```

> **Important :** `dangerouslySetInnerHTML` est sûr **uniquement** si `sanitizeContent` est appelé avant. Voir section sécurité.

### 7.3 ShareButtons (client)

```typescript
"use client";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const platforms = [
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { name: "X / Twitter", href: `https://x.com/intent/tweet?url=${encoded}&text=${encodedTitle}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}` },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encoded}` },
  ];

  const copyLink = () => navigator.clipboard.writeText(url);

  return (
    <div>
      {platforms.map((p) => (
        <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer">
          {p.name}
        </a>
      ))}
      <button onClick={copyLink}>Copier le lien</button>
    </div>
  );
}
```

---

## 8. Composants admin

### 8.1 PostForm (React Hook Form + Zod)

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPost, updatePost } from "@/actions/blog.actions";
import { slugify } from "@/lib/blog-utils";
import RichTextEditor from "./RichTextEditor";

const postSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  slug: z.string().min(1, "Slug requis").regex(/^[a-z0-9-]+$/, "Slug invalide"),
  content: z.string().min(1, "Contenu requis"),
  excerpt: z.string().max(300).optional().nullable(),
  metaDescription: z.string().max(160, "Max 160 caractères").optional().nullable(),
  tag: z.string().default("general"),
  coverImage: z.string().url().optional().nullable(),
  published: z.boolean().default(false),
});

type PostFormValues = z.infer<typeof postSchema>;

export default function PostForm({ post }: { post?: PostFormValues & { id: string } }) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<PostFormValues>({
      resolver: zodResolver(postSchema),
      defaultValues: post ?? { published: false, tag: "general" },
    });

  // Auto-slug depuis le titre (uniquement à la création)
  const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!post) setValue("slug", slugify(e.target.value));
  };

  const onSubmit = async (data: PostFormValues) => {
    if (post) {
      await updatePost(post.id, data);
    } else {
      await createPost(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("title")} onChange={onTitleChange} placeholder="Titre" />
      {errors.title && <span>{errors.title.message}</span>}

      <input {...register("slug")} placeholder="slug-de-l-article" />
      {errors.slug && <span>{errors.slug.message}</span>}

      <RichTextEditor
        value={watch("content") ?? ""}
        onChange={(val) => setValue("content", val)}
      />

      <textarea {...register("metaDescription")} placeholder="Description SEO (max 160 chars)" rows={2} />
      <span>{watch("metaDescription")?.length ?? 0}/160</span>

      <label>
        <input type="checkbox" {...register("published")} />
        Publier
      </label>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement..." : post ? "Mettre à jour" : "Créer"}
      </button>
    </form>
  );
}
```

### 8.2 PostsTable

```typescript
"use client";

import { togglePostPublished, deletePost } from "@/actions/blog.actions";
import { useState } from "react";
import Link from "next/link";

type PostRow = {
  id: string; title: string; slug: string; tag: string;
  published: boolean; publishedAt: Date | null; createdAt: Date;
};

export default function PostsTable({ posts }: { posts: PostRow[] }) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article définitivement ?")) return;
    setDeleting(id);
    await deletePost(id);
    setDeleting(null);
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Titre</th><th>Tag</th><th>Statut</th><th>Date</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {posts.map((p) => (
          <tr key={p.id}>
            <td>{p.title}</td>
            <td>{p.tag}</td>
            <td>
              <button onClick={() => togglePostPublished(p.id)}>
                {p.published ? "Publié" : "Brouillon"}
              </button>
            </td>
            <td>{(p.publishedAt ?? p.createdAt).toLocaleDateString("fr-FR")}</td>
            <td>
              <Link href={`/dashboard/blog/${p.id}`}>Modifier</Link>
              {p.published && <Link href={`/blog/${p.slug}`} target="_blank">Voir</Link>}
              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}>
                Supprimer
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 9. Utilitaires (`lib/blog-utils.ts`)

```typescript
// Génération de slug — dé-accentuement + kebab-case
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Sanitisation HTML — protège contre XSS
export function sanitizeContent(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\s+on\w+="[^"]*"/g, "")  // retire les event handlers inline
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "");           // bloque les data URI
}

// Strip HTML pour les excerpts
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Générer un excerpt automatique depuis le contenu
export function generateExcerpt(content: string, maxLength = 200): string {
  const text = stripHtml(content);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

// Temps de lecture estimé
export function getReadingTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200)); // 200 mots/min
}

// Définition des tags — à personnaliser selon le projet
export const POST_TAGS = [
  { value: "general", label: "Général" },
  { value: "actualite", label: "Actualité" },
  { value: "tutorial", label: "Tutoriel" },
  { value: "annonce", label: "Annonce" },
] as const;

export type PostTag = (typeof POST_TAGS)[number]["value"];

export function getTagLabel(tag: string): string {
  return POST_TAGS.find((t) => t.value === tag)?.label ?? tag;
}

// Couleur Tailwind par tag (à adapter à votre palette)
export function getTagColor(tag: string): string {
  const map: Record<string, string> = {
    general: "bg-gray-100 text-gray-700",
    actualite: "bg-blue-100 text-blue-700",
    tutorial: "bg-green-100 text-green-700",
    annonce: "bg-orange-100 text-orange-700",
  };
  return map[tag] ?? "bg-gray-100 text-gray-700";
}

// Optimisation d'URL Cloudinary
export function optimizeCloudinaryUrl(url: string, width = 800): string {
  if (!url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
```

---

## 10. Authentification & sécurité

### 10.1 NextAuth (credentials provider)

```typescript
// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 60 }, // 30 minutes
  pages: { signIn: "/login" },
});
```

### 10.2 Sécurité du blog — récapitulatif

| Vecteur d'attaque | Mitigation |
|---|---|
| **XSS via contenu** | `sanitizeContent()` avant `dangerouslySetInnerHTML` |
| **Injection SQL** | Prisma (ORM paramétré — pas de query brute) |
| **CSRF** | Server Actions Next.js (token automatique) |
| **Accès non autorisé admin** | `requireAdmin()` + middleware route matcher |
| **Upload malveillant** | Cloudinary gère le type MIME ; limiter via upload preset |
| **Spam / brute-force login** | Rate limiting sur `/api/auth` (ex: `next-rate-limit`) |
| **Slug injection** | Validation regex `^[a-z0-9-]+$` dans le schéma Zod |
| **Meta injection** | Échapper les champs SEO dans `generateMetadata` |
| **Open redirect** | Ne pas utiliser de paramètre `redirect` en query string |

### 10.3 Bonnes pratiques supplémentaires

```typescript
// Modèle User minimal
model User {
  id       String @id @default(cuid())
  email    String @unique
  password String // bcrypt hash (rounds: 12)
  name     String?
  role     String @default("admin") // "admin" | "editor"
}
```

```bash
# Hacher un mot de passe admin initial
node -e "const b = require('bcryptjs'); b.hash('motdepasse', 12).then(console.log)"
```

**Headers HTTP de sécurité (`next.config.ts`) :**
```typescript
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",       // 'unsafe-inline' requis pour Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://res.cloudinary.com data:",
      "frame-src https://www.youtube.com",        // si embeds vidéo
    ].join("; "),
  },
];

export default {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

---

## 11. SEO & métadonnées

### 11.1 Métadonnées dynamiques par article

```typescript
// Voir section 5.2 — generateMetadata retourne :
{
  title: `${post.title} | Nom du Site`,
  description: post.metaDescription ?? generateExcerpt(post.content, 160),
  alternates: { canonical: `https://example.com/blog/${post.slug}` },
  openGraph: {
    type: "article",
    title: post.title,
    description: post.metaDescription ?? "",
    publishedTime: post.publishedAt?.toISOString(),
    images: [{ url: post.coverImage ?? "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
}
```

### 11.2 Données structurées JSON-LD

```typescript
// Dans app/(public)/blog/[slug]/page.tsx
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  description: post.metaDescription ?? "",
  datePublished: post.publishedAt?.toISOString(),
  dateModified: post.updatedAt.toISOString(),
  image: post.coverImage ?? undefined,
  author: {
    "@type": "Organization",
    name: "Nom du Site",
    url: "https://example.com",
  },
  publisher: {
    "@type": "Organization",
    name: "Nom du Site",
    logo: { "@type": "ImageObject", url: "https://example.com/logo.png" },
  },
};

// Dans le JSX :
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>
```

### 11.3 Image Open Graph dynamique

```typescript
// app/(public)/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/actions/blog-public.actions";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#111" }}>
      <p style={{ color: "white", fontSize: 48 }}>{post?.title ?? "Blog"}</p>
    </div>,
    size
  );
}
```

---

## 12. Flux RSS & sitemap

### 12.1 Flux RSS (`app/feed.xml/route.ts`)

```typescript
import { getPublishedPosts } from "@/actions/blog-public.actions";
import { generateExcerpt } from "@/lib/blog-utils";

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "https://example.com";

export async function GET() {
  const posts = await getPublishedPosts({ limit: 20 });

  const items = posts
    .map((p) => `
      <item>
        <title><![CDATA[${p.title}]]></title>
        <link>${BASE_URL}/blog/${p.slug}</link>
        <guid>${BASE_URL}/blog/${p.slug}</guid>
        <pubDate>${new Date(p.publishedAt ?? p.createdAt).toUTCString()}</pubDate>
        <description><![CDATA[${generateExcerpt(p.content ?? "", 200)}]]></description>
      </item>
    `)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Blog | Mon Site</title>
    <link>${BASE_URL}/blog</link>
    <description>Les derniers articles de Mon Site</description>
    <language>fr</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
```

**Lien RSS dans le `<head>` (`app/layout.tsx`) :**
```typescript
export const metadata: Metadata = {
  // ...
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};
```

### 12.2 Sitemap dynamique (`app/sitemap.ts`)

```typescript
import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/actions/blog-public.actions";

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();

  const postEntries = posts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt ?? p.createdAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    ...postEntries,
  ];
}
```

---

## 13. Upload d'images (Cloudinary)

### 13.1 Configuration

```bash
npm install next-cloudinary
```

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
# Upload preset en mode "unsigned" pour simplifier
# Créer dans Cloudinary Dashboard > Settings > Upload > Add upload preset
# Nom suggéré : my_blog_uploads
# Mode : Unsigned
# Folder : blog/
# Formats autorisés : jpg,jpeg,png,webp
# Max file size : 5 MB
```

### 13.2 Composant ImageUpload

```typescript
"use client";

import { CldUploadWidget } from "next-cloudinary";

type UploadResult = { info: { secure_url: string } };

export default function ImageUpload({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (url: string) => void;
}) {
  return (
    <CldUploadWidget
      uploadPreset="my_blog_uploads"
      options={{ maxFileSize: 5_000_000, resourceType: "image" }}
      onSuccess={(result: UploadResult) => onChange(result.info.secure_url)}
    >
      {({ open }) => (
        <button type="button" onClick={() => open()}>
          {value ? "Changer l'image" : "Ajouter une image"}
        </button>
      )}
    </CldUploadWidget>
  );
}
```

---

## 14. Éditeur de texte riche (TipTap)

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image \
  @tiptap/extension-link @tiptap/extension-underline @tiptap/extension-text-align \
  @tiptap/extension-youtube @tiptap/extension-character-count
```

```typescript
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";

export default function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({ controls: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="border rounded">
      {/* Toolbar simplifiée — étendre selon les besoins */}
      <div className="flex gap-2 p-2 border-b">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>• Liste</button>
      </div>
      <EditorContent editor={editor} className="p-4 min-h-[300px]" />
    </div>
  );
}
```

---

## 15. Performance & cache

| Stratégie | Où | Détail |
|---|---|---|
| **ISR (revalidate: 60)** | Pages `/blog` et `/blog/[slug]` | Revalide toutes les 60s |
| **generateStaticParams** | `/blog/[slug]/page.tsx` | Pré-génère les slugs connus |
| **revalidatePath** | Chaque Server Action | Invalide les pages affectées |
| **unstable_cache** | Actions de lecture lourdes | Cache TTL configurable |
| **noStore** | Lectures publiques temps réel | Désactive le cache statique |
| **Cloudinary transforms** | Images | `f_auto,q_auto,w_800` |
| **next/image** | Toutes les images | Lazy loading, formats modernes |

```typescript
// Exemple : lecture avec cache de 60s
import { unstable_cache } from "next/cache";

export const getCachedPublishedPosts = unstable_cache(
  async () => prisma.post.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } }),
  ["published-posts"],
  { revalidate: 60, tags: ["posts"] }
);

// Invalider le cache par tag dans les actions :
import { revalidateTag } from "next/cache";
revalidateTag("posts");
```

---

## 16. Variables d'environnement requises

```env
# Base de données
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://example.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Cloudinary (optionnel)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"

# URL publique du site (RSS, sitemap, OG)
NEXT_PUBLIC_URL="https://example.com"
```

```bash
# Générer NEXTAUTH_SECRET
openssl rand -base64 32
```

---

## 17. Checklist d'intégration

### Setup initial
- [ ] Ajouter le modèle `Post` dans `prisma/schema.prisma`
- [ ] Ajouter le modèle `User` avec champ `password` hashé
- [ ] Exécuter `prisma db push` ou `prisma migrate dev`
- [ ] Créer un premier utilisateur admin en base (bcrypt hash)
- [ ] Configurer NextAuth (`auth.ts`, `auth.config.ts`, `middleware.ts`)
- [ ] Ajouter les variables d'environnement

### Blog public
- [ ] Créer `app/(public)/blog/page.tsx`
- [ ] Créer `app/(public)/blog/[slug]/page.tsx`
- [ ] Créer `components/blog/BlogGrid.tsx` + `ArticleCard.tsx`
- [ ] Créer `components/blog/ArticleContent.tsx` avec `sanitizeContent`
- [ ] Ajouter les métadonnées dynamiques (`generateMetadata`)
- [ ] Ajouter les données structurées JSON-LD
- [ ] Créer `app/(public)/blog/[slug]/opengraph-image.tsx`
- [ ] Ajouter un lien vers le blog dans la navigation

### Admin
- [ ] Créer `app/(admin)/dashboard/blog/` (liste, new, [id])
- [ ] Créer `components/admin/PostForm.tsx` (RHF + Zod)
- [ ] Créer `components/admin/PostsTable.tsx`
- [ ] Créer `components/admin/RichTextEditor.tsx` (TipTap)
- [ ] Configurer le middleware de protection admin

### Utilitaires & qualité
- [ ] Créer `lib/blog-utils.ts` (slugify, sanitizeContent, etc.)
- [ ] Créer `actions/blog.actions.ts` + `actions/blog-public.actions.ts`
- [ ] Ajouter `app/feed.xml/route.ts` (RSS)
- [ ] Ajouter `app/sitemap.ts` avec les articles
- [ ] Ajouter les headers de sécurité dans `next.config.ts`
- [ ] Configurer Cloudinary upload preset (si images)

### Tests & vérifications
- [ ] Vérifier qu'un non-authentifié ne peut pas accéder à `/dashboard`
- [ ] Vérifier que `sanitizeContent` retire bien `<script>` et événements
- [ ] Vérifier le score Lighthouse (Performance, SEO, Accessibility)
- [ ] Vérifier l'index dans Google Search Console (sitemap soumis)
- [ ] Tester le flux RSS dans un lecteur (Feedly, etc.)
- [ ] Tester les OG images avec [opengraph.xyz](https://www.opengraph.xyz)

---

## Dépendances npm à installer

```bash
# Core
npm install @prisma/client prisma
npm install next-auth@beta
npm install bcryptjs
npm install @types/bcryptjs -D

# Formulaires
npm install react-hook-form @hookform/resolvers zod

# Éditeur
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image \
  @tiptap/extension-link @tiptap/extension-underline @tiptap/extension-text-align \
  @tiptap/extension-youtube

# Upload (optionnel)
npm install next-cloudinary
```

---

*Document généré depuis le projet HCO Website — pattern extractable et réutilisable pour tout projet Next.js App Router.*
