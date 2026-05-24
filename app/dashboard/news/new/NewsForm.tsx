'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createNews, updateNews } from '@/lib/actions/news';
import { slugify } from '@/lib/utils/slug';
import { useRouter } from 'next/navigation';
import { LRH, display, body, mono } from '@/components/lrh/tokens';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

// RichTextEditor = TipTap + ses ~10 extensions ≈ 100 Kio compressé.
// On le lazy-load car il n'est utile que sur le form NewsForm (rarement
// visité, jamais sur la home). Sans `ssr: false`, Next essaierait de
// pré-rendre l'editor qui touche `document` et erre côté server.
const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: 320,
        background: LRH.paperWarm,
        border: '1px dashed ' + LRH.hairStrong,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...mono,
        fontSize: 11,
        color: LRH.mute,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      ◌ Éditeur en cours de chargement
    </div>
  ),
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NewsSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(140),
  slug: z.string().min(1, "Slug requis").max(160).regex(slugRegex, "lettres min., chiffres et tirets uniquement"),
  excerpt: z.string().max(280).optional(),
  content: z.string().min(1, "Le contenu est requis"),
  coverImage: z.union([z.string().url("URL invalide"), z.literal("")]).optional(),
  category: z.enum(["ACTUALITE", "RESULTAT", "EVENEMENT", "COMMUNIQUE"]),
  published: z.boolean(),
  clubId: z.string().optional(),
});

type NewsFormData = z.infer<typeof NewsSchema>;

type ClubOption = { id: string; name: string; city: string };

export type ExistingArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  category: NewsFormData['category'];
  published: boolean;
  clubId: string | null;
};

type NewsFormProps = {
  defaultClubId: string | null;
  isAdmin: boolean;
  clubs: ClubOption[];
  existing?: ExistingArticle;
};

const CATEGORY_LABELS: Record<NewsFormData['category'], string> = {
  ACTUALITE: 'Actualité',
  RESULTAT: 'Résultat',
  EVENEMENT: 'Événement',
  COMMUNIQUE: 'Communiqué',
};

const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  color: LRH.mute,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  display: 'block',
  marginBottom: 8,
};

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 8,
  ...body,
  fontSize: 16,
  outline: 'none',
  border: '1.5px solid ' + LRH.hairStrong,
  color: LRH.navy,
  background: '#fff',
};

export default function NewsForm({ defaultClubId, isAdmin, clubs, existing }: NewsFormProps) {
  const [loading, setLoading] = useState(false);
  // En mode édition on n'auto-régénère pas le slug : le slug fait partie de
  // l'URL publique, l'admin doit le changer explicitement.
  const isEdit = !!existing;
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEdit);
  const router = useRouter();

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<NewsFormData>({
    resolver: zodResolver(NewsSchema),
    defaultValues: {
      title: existing?.title ?? '',
      slug: existing?.slug ?? '',
      excerpt: existing?.excerpt ?? '',
      content: existing?.content ?? '',
      coverImage: existing?.coverImage ?? '',
      category: existing?.category ?? 'ACTUALITE',
      published: existing?.published ?? false,
      clubId: existing?.clubId ?? defaultClubId ?? '',
    },
  });

  const titleValue = watch('title');

  React.useEffect(() => {
    if (!slugManuallyEdited) {
      setValue('slug', slugify(titleValue ?? ''));
    }
  }, [titleValue, slugManuallyEdited, setValue]);

  const onSubmit = async (data: NewsFormData) => {
    setLoading(true);
    try {
      const payload = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || undefined,
        content: data.content,
        coverImage: data.coverImage ? data.coverImage : undefined,
        category: data.category,
        published: data.published,
        clubId: data.clubId ? data.clubId : undefined,
      };
      if (isEdit && existing) {
        // `ensureUniqueSlug` peut suffixer en cas de collision → on récupère
        // le slug effectif depuis la valeur retournée.
        const updated = await updateNews(existing.id, payload);
        router.push(`/actualites/${updated.slug}`);
      } else {
        await createNews(payload);
        router.push('/dashboard');
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      alert(isEdit ? "Une erreur est survenue lors de la mise à jour" : "Une erreur est survenue lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', padding: 'clamp(16px, 3vw, 32px)', borderRadius: 16, border: '1px solid ' + LRH.hair }}>
      <h1 style={{ ...display, fontWeight: 700, fontSize: 24, color: LRH.navy, marginBottom: 24 }}>
        {isEdit ? 'Modifier l\'article' : 'Nouvel article'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Titre</label>
          <input
            {...register('title')}
            style={{ ...inputBase, border: '1.5px solid ' + (errors.title ? LRH.red : LRH.hairStrong) }}
            placeholder="Titre accrocheur..."
          />
          {errors.title && <p style={{ ...body, fontSize: 12, color: LRH.red, marginTop: 4 }}>{errors.title.message}</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Slug (URL)</label>
          <input
            {...register('slug')}
            onChange={(e) => {
              setSlugManuallyEdited(true);
              setValue('slug', e.target.value);
            }}
            style={{ ...inputBase, fontFamily: 'monospace', border: '1.5px solid ' + (errors.slug ? LRH.red : LRH.hairStrong) }}
            placeholder="mon-article"
          />
          {errors.slug && <p style={{ ...body, fontSize: 12, color: LRH.red, marginTop: 4 }}>{errors.slug.message}</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Résumé (optionnel)</label>
          <textarea
            {...register('excerpt')}
            rows={2}
            style={{ ...inputBase, resize: 'vertical', border: '1.5px solid ' + (errors.excerpt ? LRH.red : LRH.hairStrong) }}
            placeholder="Court résumé pour les listings (280 car max)"
          />
          {errors.excerpt && <p style={{ ...body, fontSize: 12, color: LRH.red, marginTop: 4 }}>{errors.excerpt.message}</p>}
        </div>

        <div style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Catégorie</label>
            <select
              {...register('category')}
              style={{ ...inputBase, border: '1.5px solid ' + (errors.category ? LRH.red : LRH.hairStrong) }}
            >
              {(Object.keys(CATEGORY_LABELS) as NewsFormData['category'][]).map((key) => (
                <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div>
              <label style={labelStyle}>Club (optionnel)</label>
              <select
                {...register('clubId')}
                style={{ ...inputBase, border: '1.5px solid ' + LRH.hairStrong }}
              >
                <option value="">— Article ligue (aucun club) —</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <Controller
            name="coverImage"
            control={control}
            render={({ field }) => (
              <ImageUploader
                label="Image de couverture (optionnel)"
                value={field.value ?? ''}
                onChange={(url) => field.onChange(url ?? '')}
                height={200}
                hint="Glissez une image, cliquez pour parcourir, ou collez une URL."
              />
            )}
          />
          {errors.coverImage && <p style={{ ...body, fontSize: 12, color: LRH.red, marginTop: 4 }}>{errors.coverImage.message}</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Contenu</label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Écrivez votre article…"
                error={!!errors.content}
              />
            )}
          />
          {errors.content && <p style={{ ...body, fontSize: 12, color: LRH.red, marginTop: 4 }}>{errors.content.message}</p>}
        </div>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="checkbox" {...register('published')} id="published" style={{ width: 18, height: 18 }} />
          <label htmlFor="published" style={{ ...body, fontSize: 14, color: LRH.navy, fontWeight: 600 }}>
            {isEdit ? 'Article publié' : 'Publier immédiatement'}
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              flex: 1, padding: '14px', background: 'transparent', color: LRH.navy,
              border: '1px solid ' + LRH.hairStrong, borderRadius: 8, ...display,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase',
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 2, padding: '14px', background: LRH.red, color: '#fff',
              border: 'none', borderRadius: 8, ...display, fontWeight: 700,
              fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? (isEdit ? 'Mise à jour…' : 'Création…')
              : (isEdit ? 'Enregistrer les modifications' : 'Enregistrer')}
          </button>
        </div>
      </form>
    </div>
  );
}
