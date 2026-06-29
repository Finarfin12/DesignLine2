import { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Undo, Redo, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import api from '../lib/api';
import { showAlert } from '../lib/alert';

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarButton({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title} className={`p-1.5 rounded-md transition-colors ${active ? 'bg-primary-100 text-primary-700' : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}`}>{children}</button>
  );
}

export default function RichTextEditor({ content, onChange, placeholder }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: placeholder || 'Tulis sesuatu...' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-1 py-2' },
    },
  });

  if (!editor) return null;

  const addLink = async () => {
    const { value: url } = await showAlert.input('Tambah Tautan', 'Masukkan URL:', 'url');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await api.post('/api/assets/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      editor.chain().focus().setImage({ src: data.url }).run();
    } catch {
      showAlert.error('Gagal', 'Gagal mengunggah gambar');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden">
      <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={addImage} />
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-surface-200 bg-surface-50 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Tebal"><Bold className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Miring"><Italic className="w-4 h-4" /></ToolbarButton>
        <div className="w-px h-5 bg-surface-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 className="w-4 h-4" /></ToolbarButton>
        <div className="w-px h-5 bg-surface-200 mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Daftar"><List className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Daftar berurut"><ListOrdered className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Kutipan"><Quote className="w-4 h-4" /></ToolbarButton>
        <div className="w-px h-5 bg-surface-200 mx-1" />
        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Tautan"><LinkIcon className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => fileRef.current?.click()} title="Gambar"><ImageIcon className="w-4 h-4" /></ToolbarButton>
        <div className="flex-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo className="w-4 h-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo className="w-4 h-4" /></ToolbarButton>
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}
