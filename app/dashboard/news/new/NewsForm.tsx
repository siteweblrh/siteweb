'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createNews } from '@/lib/actions/news';
import { useRouter } from 'next/navigation';
import { LRH, display, body, mono } from '@/components/lrh/tokens';

const NewsSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(100),
  content: z.string().min(1, "Le contenu est requis"),
  published: z.boolean().default(false),
  clubId: z.string().cuid(),
});

type NewsFormData = z.infer<typeof NewsSchema>;

export default function NewsForm({ clubId }: { clubId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors } } = useForm<NewsFormData>({
    resolver: zodResolver(NewsSchema),
    defaultValues: {
      clubId,
      published: false,
    }
  });

  const onSubmit = async (data: NewsFormData) => {
    setLoading(true);
    try {
      await createNews(data);
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
        <input type="hidden" {...register('clubId')} />

        <div style={{ marginBottom: 20 }}>
          <label style={{ ...mono, fontSize: 10, color: LRH.mute, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
            Titre de l'article
          </label>
          <input
            {...register('title')}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 8,
              border: '1.5px solid ' + (errors.title ? LRH.red : LRH.hairStrong),
              ...body, fontSize: 16, outline: 'none'
            }}
            placeholder="Titre accrocheur..."
          />
          {errors.title && <p style={{ ...body, fontSize: 12, color: LRH.red, marginTop: 4 }}>{errors.title.message}</p>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ ...mono, fontSize: 10, color: LRH.mute, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>
            Contenu
          </label>
          <textarea
            {...register('content')}
            rows={10}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 8,
              border: '1.5px solid ' + (errors.content ? LRH.red : LRH.hairStrong),
              ...body, fontSize: 16, outline: 'none', resize: 'vertical'
            }}
            placeholder="Écrivez votre article ici..."
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
              fontWeight: 700, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase'
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
              textTransform: 'uppercase', opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Création...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
