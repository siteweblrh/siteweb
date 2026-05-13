'use client';

import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { LRH, mono, body } from '@/components/lrh/tokens';

type ToolbarButton = {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

function ToolbarBtn({ b }: { b: ToolbarButton }) {
  return (
    <button
      type="button"
      title={b.title}
      onClick={b.onClick}
      disabled={b.disabled}
      style={{
        ...mono,
        fontSize: 11,
        fontWeight: 700,
        padding: '6px 10px',
        borderRadius: 6,
        border: '1px solid ' + (b.active ? LRH.navy : 'transparent'),
        background: b.active ? LRH.navy : 'transparent',
        color: b.active ? '#fff' : LRH.navy,
        cursor: b.disabled ? 'not-allowed' : 'pointer',
        opacity: b.disabled ? 0.4 : 1,
        letterSpacing: '0.04em',
        minWidth: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
    >
      {b.label}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href ?? '';
    const url = window.prompt('URL du lien', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const groups: ToolbarButton[][] = [
    [
      { label: 'B', title: 'Gras (Ctrl+B)', active: editor.isActive('bold'),     onClick: () => editor.chain().focus().toggleBold().run() },
      { label: 'I', title: 'Italique (Ctrl+I)', active: editor.isActive('italic'), onClick: () => editor.chain().focus().toggleItalic().run() },
      { label: 'U', title: 'Souligné (Ctrl+U)', active: editor.isActive('underline'), onClick: () => editor.chain().focus().toggleUnderline().run() },
      { label: 'S', title: 'Barré', active: editor.isActive('strike'), onClick: () => editor.chain().focus().toggleStrike().run() },
    ],
    [
      { label: 'H2', title: 'Titre 2', active: editor.isActive('heading', { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: 'H3', title: 'Titre 3', active: editor.isActive('heading', { level: 3 }), onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
      { label: '¶',  title: 'Paragraphe', active: editor.isActive('paragraph'), onClick: () => editor.chain().focus().setParagraph().run() },
    ],
    [
      { label: '• Liste', title: 'Liste à puces', active: editor.isActive('bulletList'), onClick: () => editor.chain().focus().toggleBulletList().run() },
      { label: '1. Liste', title: 'Liste numérotée', active: editor.isActive('orderedList'), onClick: () => editor.chain().focus().toggleOrderedList().run() },
      { label: '❝',     title: 'Citation', active: editor.isActive('blockquote'), onClick: () => editor.chain().focus().toggleBlockquote().run() },
      { label: '<>',    title: 'Bloc de code', active: editor.isActive('codeBlock'), onClick: () => editor.chain().focus().toggleCodeBlock().run() },
    ],
    [
      { label: '←',  title: 'Aligner à gauche',  active: editor.isActive({ textAlign: 'left' }),    onClick: () => editor.chain().focus().setTextAlign('left').run() },
      { label: '↔',  title: 'Centrer',          active: editor.isActive({ textAlign: 'center' }),  onClick: () => editor.chain().focus().setTextAlign('center').run() },
      { label: '→',  title: 'Aligner à droite', active: editor.isActive({ textAlign: 'right' }),   onClick: () => editor.chain().focus().setTextAlign('right').run() },
    ],
    [
      { label: '🔗', title: 'Lien',     active: editor.isActive('link'), onClick: setLink },
      { label: '⤺',  title: 'Annuler (Ctrl+Z)', onClick: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo() },
      { label: '⤻',  title: 'Rétablir (Ctrl+Y)', onClick: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo() },
    ],
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        padding: '8px 10px',
        background: '#fff',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottom: '1px solid ' + LRH.hair,
        position: 'sticky',
        top: 0,
        zIndex: 1,
      }}
    >
      {groups.map((g, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && (
            <span style={{ width: 1, height: 20, background: LRH.hair, alignSelf: 'center', margin: '0 4px' }} />
          )}
          {g.map((b, bi) => (
            <ToolbarBtn key={bi} b={b} />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Écrivez votre article…",
  error,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'lrh-editor-content',
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  if (!editor) {
    return (
      <div style={{
        minHeight: 320, borderRadius: 8,
        border: '1.5px solid ' + LRH.hairStrong,
        background: '#fff', padding: 16,
        ...body, fontSize: 14, color: LRH.mute,
      }}>
        Chargement de l'éditeur…
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1.5px solid ' + (error ? LRH.red : LRH.hairStrong),
        borderRadius: 8,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <style>{`
        .lrh-editor-content {
          padding: 16px;
          min-height: 320px;
          outline: none;
          color: ${LRH.navy};
          font-family: var(--font-montserrat), system-ui, sans-serif;
          font-size: 16px;
          line-height: 1.6;
        }
        .lrh-editor-content p { margin: 0 0 0.75em; }
        .lrh-editor-content h2 { font-family: var(--font-poppins), system-ui, sans-serif; font-size: 26px; font-weight: 700; color: ${LRH.navy}; margin: 1.4em 0 0.5em; letter-spacing: -0.01em; }
        .lrh-editor-content h3 { font-family: var(--font-poppins), system-ui, sans-serif; font-size: 20px; font-weight: 700; color: ${LRH.navy}; margin: 1.2em 0 0.4em; letter-spacing: -0.01em; }
        .lrh-editor-content ul, .lrh-editor-content ol { padding-left: 1.5em; margin: 0 0 0.75em; }
        .lrh-editor-content li { margin: 0.25em 0; }
        .lrh-editor-content blockquote { border-left: 4px solid ${LRH.gold}; padding: 6px 14px; background: ${LRH.paperWarm}; border-radius: 0 6px 6px 0; color: ${LRH.ink}; font-style: italic; margin: 0 0 0.75em; }
        .lrh-editor-content code { background: ${LRH.paper}; padding: 1px 5px; border-radius: 3px; font-family: var(--font-jetbrains-mono), ui-monospace, monospace; font-size: 0.92em; }
        .lrh-editor-content pre { background: ${LRH.ink}; color: #f3f4f6; padding: 12px 14px; border-radius: 6px; overflow-x: auto; margin: 0 0 0.75em; }
        .lrh-editor-content pre code { background: transparent; color: inherit; padding: 0; }
        .lrh-editor-content a { color: ${LRH.red}; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
        .lrh-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(10, 18, 32, 0.42);
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
