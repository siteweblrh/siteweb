'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createNews } from '@/lib/actions/news';
import { slugify } from '@/lib/utils/slug';
import { useRouter } from 'next/navigation';
import { LRH, display, body, mono } from '@/components/lrh/tokens';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';

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

type NewsFormProps = {
  defaultClubId: string | null;
  isAdmin: boolean;
  clubs: ClubOption[];
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

export default function NewsForm({ defaultClubId, isAdmin, clubs }: NewsFormProps) {
  const [loading, setLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<NewsFormData>({
    resolver: zodResolver(NewsSchema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      coverImage: '',
      category: 'ACTUALITE',
      published: false,
      clubId: defaultClubId ?? '',
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
      await createNews({
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || undefined,
        content: data.content,
        coverImage: data.coverImage ? data.coverImage : undefined,
        category: data.category,
        published: data.published,
        clubId: data.clubId ? data.clubId : undefined,
      });
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', padding: 32, borderRadius: 16, border: '1px solid ' + LRH.hair }}>
      <h1 style={{ ...display, fontWeight: 700, fontSize: 24, color: LRH.navy, marginBottom: 24 }}>
        Nouvel article
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
            Publier immédiatement
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
            {loading ? 'Création...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
