import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, X, Building2, Phone, Mail, Trash2, Edit3 } from 'lucide-react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import TagManager from '../components/TagManager';

const clientSchema = z.object({
  name: z.string().min(1, 'Nama klien wajib diisi'),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  company: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
type ClientForm = z.infer<typeof clientSchema>;

export default function Clients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.get('/api/tags').then(r => r.data) });

  const { data: clients = [], isLoading } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/api/clients').then(r => r.data),
  });

  const filtered = clients.filter((c: any) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.company && c.company.toLowerCase().includes(search.toLowerCase()))) return false;
    if (selectedTagIds.length === 0) return true;
    const clientTagIds = (c.tags ?? []).map((t: any) => t.tag.id);
    return selectedTagIds.some(id => clientTagIds.includes(id));
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  });

  const handleEdit = (client: any) => {
    setEditingId(client.id);
    reset({ name: client.name, email: client.email || '', company: client.company || '', phone: client.phone || '', notes: client.notes || '' });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    reset({ name: '', email: '', company: '', phone: '', notes: '' });
  };

  const saveMutation = useMutation({
    mutationFn: (data: ClientForm) => editingId ? api.put(`/api/clients/${editingId}`, data) : api.post('/api/clients', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); handleClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Directory Klien</h1>
          <p className="text-surface-500 text-sm mt-1">Kelola data klien, perusahaan, dan kontak.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari klien atau perusahaan..." className="input pl-9 rounded-md bg-surface-50 border-surface-200 focus:bg-white" />
          </div>
          <button onClick={() => { handleClose(); setShowModal(true); }} className="btn-primary rounded-md"><Plus className="w-4 h-4" /> Tambah Klien</button>
        </div>
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag: any) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTagIds(prev => prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                selectedTagIds.includes(tag.id)
                  ? 'border-current shadow-sm ring-1 ring-current'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: tag.color + '18', color: tag.color }}
            >
              {tag.name}
            </button>
          ))}
          {selectedTagIds.length > 0 && (
            <button
              onClick={() => setSelectedTagIds([])}
              className="px-2 py-1 rounded-full text-[11px] font-semibold text-surface-400 hover:text-surface-700 border border-dashed border-surface-300"
            >
              <X className="w-3 h-3 inline" /> Hapus filter
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface-100 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 card border-dashed border-2 bg-transparent">
          <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-surface-400" />
          </div>
          <h3 className="text-surface-900 font-bold mb-1">Belum ada data klien</h3>
          <p className="text-surface-500 text-sm">Tambahkan klien baru untuk mulai mencatat informasi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(client => (
            <div key={client.id} className="card group hover:border-primary-300 transition-all duration-200 flex flex-col h-full overflow-hidden">
              <div className="p-5 flex-1 relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => handleEdit(client)} className="p-1.5 text-surface-400 hover:text-primary-600 bg-white rounded-md shadow-sm border border-surface-200"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { Swal.fire({ title: 'Hapus Klien?', text: 'Data klien yang dihapus tidak dapat dikembalikan.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal' }).then((r) => { if (r.isConfirmed) deleteMutation.mutate(client.id); }); }} className="p-1.5 text-surface-400 hover:text-red-600 bg-white rounded-md shadow-sm border border-surface-200"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                
                <div className="w-12 h-12 bg-primary-50 rounded-xl border border-primary-100 flex items-center justify-center mb-4 text-primary-600 font-bold text-lg">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                
                <h3 className="font-bold text-surface-900 text-lg mb-1">{client.name}</h3>
                {client.company && (
                  <div className="flex items-center gap-1.5 text-surface-600 text-sm mb-3 font-medium">
                    <Building2 className="w-4 h-4 text-surface-400" />
                    {client.company}
                  </div>
                )}
                
                <div className="space-y-2 mt-4">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-surface-600">
                      <Mail className="w-4 h-4 text-surface-400" />
                      <a href={`mailto:${client.email}`} className="hover:text-primary-600 hover:underline">{client.email}</a>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-surface-600">
                      <Phone className="w-4 h-4 text-surface-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {client.tags.map((t: any) => (
                        <span key={t.tag.id} className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: t.tag.color + '18', color: t.tag.color }}>{t.tag.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-surface-50 border-t border-surface-100 px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-surface-500 font-medium">{client._count.projects} Proyek</span>
                <Link to={`/projects?client=${client.id}`} className="text-primary-600 font-semibold hover:text-primary-700">Lihat Proyek →</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 animate-slide-up shadow-xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-surface-900">{editingId ? 'Edit Klien' : 'Klien Baru'}</h2>
              <button onClick={handleClose} className="p-2 hover:bg-surface-100 rounded-full text-surface-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Nama Lengkap *</label>
                <input className="input" placeholder="Nama Klien..." {...register('name')} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Perusahaan / Brand</label>
                <input className="input" placeholder="PT Kreatif Maju" {...register('company')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="email@klien.com" {...register('email')} />
                </div>
                <div>
                  <label className="label">No. Telepon / WhatsApp</label>
                  <input className="input" placeholder="08123456..." {...register('phone')} />
                </div>
              </div>
              <div>
                <label className="label">Catatan Internal</label>
                <textarea className="textarea" rows={3} placeholder="Info tambahan klien..." {...register('notes')} />
              </div>
              
              <div className="pt-2">
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary w-full">
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Klien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
