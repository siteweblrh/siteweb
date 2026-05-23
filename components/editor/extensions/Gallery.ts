/**
 * Extension TipTap — Galerie d'images côte à côte (2 à 4 photos).
 *
 * Stocke les URLs dans un attribut `images: string[]` du node. Rendu HTML :
 *   <div data-gallery class="lrh-gallery">
 *     <img src="…" alt="" />
 *     <img src="…" alt="" />
 *   </div>
 *
 * Pourquoi un node custom (et pas juste plusieurs `<img>` libres) :
 * - Le bloc est manipulé comme un tout dans l'éditeur (sélection/suppression).
 * - À la réouverture d'un article, on lit le `data-gallery` pour reconstruire
 *   le node (sinon TipTap voit 2 images "libres" et perd le côte-à-côte).
 * - Sanitize/CSS publics ont une cible stable (`div[data-gallery]`).
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface GalleryOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    gallery: {
      /** Insère une galerie au point d'insertion courant. */
      setGallery: (options: { images: string[] }) => ReturnType;
    };
  }
}

export const Gallery = Node.create<GalleryOptions>({
  name: 'gallery',
  group: 'block',
  atom: true,        // node insécable côté éditeur (selectionne le bloc entier)
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: { class: 'lrh-gallery' },
    };
  },

  addAttributes() {
    return {
      images: {
        default: [] as string[],
        parseHTML: (el) =>
          Array.from((el as HTMLElement).querySelectorAll('img')).map((img) =>
            img.getAttribute('src') ?? '',
          ).filter(Boolean),
        renderHTML: () => ({}),  // les URLs sortent comme <img> enfants, pas comme attribut
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-gallery]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const urls = (node.attrs.images as string[] | undefined) ?? [];
    const imgChildren = urls.map((src) => ['img', { src, alt: '' }] as const);
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-gallery': '' }),
      ...imgChildren,
    ];
  },

  addCommands() {
    return {
      setGallery:
        ({ images }) =>
        ({ commands }) => {
          if (!Array.isArray(images) || images.length < 2) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { images },
          });
        },
    };
  },
});
