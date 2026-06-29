import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, FileText, Trash2, Pencil } from 'lucide-react';
import api from '../lib/api';
import { showAlert } from '../lib/alert';
import RichTextEditor from '../components/RichTextEditor';

export default function Ideate() {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => api.get('/api/assets', { params: { type: 'moodboard', limit: 100 } }).then(r => {
      const items = r.data.assets || [];
      return items.filter((a: any) => a.metadata?.type === 'note').sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),
  });

  const notes = data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/assets/${id}`),
    onSuccess: () => {
      showAlert.success('Berhasil', 'Catatan berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const openNew = () => {
    setEditId(null);
    setTitle('');
    setContent('');
    setIsOpen(true);
  };

  const openEdit = (note: any) => {
    setEditId(note.id);
    setTitle(note.name);
    setContent(note.metadata?.content || '');
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!content.trim()) { showAlert.error('Kosong', 'Isi catatan terlebih dahulu'); return; }
    setSaving(true);
    try {
      const payload = { name: title.trim() || 'Catatan Baru', type: 'moodboard', metadata: { type: 'note', content: content.trim() } };
      if (editId) {
        await api.put(`/api/assets/${editId}`, payload);
      } else {
        await api.post('/api/assets/link', payload);
      }
      setIsOpen(false);
      setTitle('');
      setContent('');
      qc.invalidateQueries({ queryKey: ['notes'] });
    } catch {
      showAlert.error('Gagal', 'Gagal menyimpan catatan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (note: any) => {
    showAlert.confirm('Hapus Catatan', `Yakin ingin menghapus "${note.name}"?`, () => deleteMutation.mutate(note.id));
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Ideate</h1>
          <p className="text-surface-500 mt-1">{notes.length} catatan — Tulis ide, sketsa konsep, atau referensi</p>
        </div>
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Catatan Baru</button>
      </div>

      {notes.length === 0 ? (
        <div className="card p-16 text-center border-dashed bg-surface-50/50">
          <FileText className="w-12 h-12 mx-auto mb-3 text-amber-400" />
          <p className="text-surface-600 font-medium mb-1">Belum ada catatan</p>
          <p className="text-surface-500 text-sm mb-4">Buat catatan pertama untuk ide, sketsa, atau referensi visual</p>
          <button onClick={openNew} className="btn-primary btn-sm inline-flex"><Plus className="w-3 h-3" />Buat Catatan</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note: any) => (
            <div key={note.id} className="card group relative bg-white hover:border-primary-200 transition-all overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-surface-900 truncate">{note.name}</p>
                    <p className="text-xs text-surface-400 mt-0.5">{new Date(note.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="text-surface-600 text-sm leading-relaxed line-clamp-4 prose prose-sm max-w-none prose-headings:text-inherit prose-a:text-inherit" dangerouslySetInnerHTML={{ __html: note.metadata?.content || '' }} />
              </div>
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(note)} className="btn-ghost btn-icon bg-white/90 backdrop-blur hover:bg-white shadow-sm" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(note)} className="btn-danger btn-icon shadow-sm" title="Hapus"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h3 className="text-lg font-bold text-surface-900">{editId ? 'Edit Catatan' : 'Catatan Baru'}</h3>
              <button onClick={() => setIsOpen(false)} className="text-surface-400 hover:text-surface-900"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <input type="text" placeholder="Judul catatan" className="input w-full" value={title} onChange={e => setTitle(e.target.value)} />
              <RichTextEditor content={content} onChange={setContent} placeholder="Tulis ide, sketsa konsep, atau catatan apa pun..." />
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-surface-200">
              <button onClick={() => setIsOpen(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Menyimpan...' : 'Simpan Catatan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
