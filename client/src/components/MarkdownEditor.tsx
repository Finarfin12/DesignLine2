import { useState, useRef, useCallback } from 'react';
import { Bold, Italic, Heading, List, Link, Eye, EyeOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function MarkdownEditor({ value, onChange, placeholder, rows = 8 }: Props) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insert = useCallback((before: string, after = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);
    const text = selected || 'teks';
    const newVal = value.substring(0, start) + before + text + after + value.substring(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + text.length);
    });
  }, [value, onChange]);

  const insertLink = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);
    const text = selected || 'teks';
    const url = '[url](https://)';
    const newVal = value.substring(0, start) + '[' + text + '](' + url + ')' + value.substring(end);
    onChange(newVal);
  }, [value, onChange]);

  const toolbar = [
    { icon: Bold, label: 'Bold', action: () => insert('**', '**') },
    { icon: Italic, label: 'Italic', action: () => insert('*', '*') },
    { icon: Heading, label: 'Heading', action: () => insert('## ') },
    { icon: List, label: 'List', action: () => insert('- ') },
    { icon: Link, label: 'Link', action: insertLink },
  ];

  return (
    <div className="border border-surface-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-2 py-1.5 bg-surface-50 border-b border-surface-200">
        <div className="flex gap-0.5">
          {toolbar.map(t => (
            <button
              key={t.label}
              type="button"
              onClick={t.action}
              className="p-1.5 rounded-md hover:bg-surface-200 text-surface-600 hover:text-surface-900 transition-colors"
              title={t.label}
            >
              <t.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPreview(p => !p)}
          className="flex items-center gap-1 text-xs font-medium text-surface-500 hover:text-surface-900 transition-colors px-2 py-1 rounded-md hover:bg-surface-200"
        >
          {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div className="p-4 prose prose-sm prose-surface max-w-none min-h-[180px]">
          <ReactMarkdown>{value || '*Belum ada deskripsi*'}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-y border-0 outline-none focus:ring-0 p-4 text-sm font-mono text-surface-900 placeholder-surface-400 bg-white"
        />
      )}
    </div>
  );
}
