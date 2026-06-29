import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

const brandSchema = z.object({
  name: z.string().min(1, 'Nama brand wajib diisi'),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  neutralColor: z.string().optional(),
  fontHeading: z.string().optional(),
  fontBody: z.string().optional(),
});
type BrandForm = z.infer<typeof brandSchema>;

export default function Brands() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: brands = [], isLoading } = useQuery<any[]>({
    queryKey: ['brands'],
    queryFn: () => api.get('/api/brands').then(r => r.data),
  });

  const filtered = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: (data: BrandForm) => api.post('/api/brands', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); setShowModal(false); reset(); },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
  });

  const getLuma = (c: string) => {
    const hex = c.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b; 
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-surface-900">Branding Library</h1>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari brand..." className="input pl-9 rounded-md bg-surface-50 border-surface-200 focus:bg-white" />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary rounded-md"><Plus className="w-4 h-4" /> Tambah Brand</button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-surface-500 border-dashed bg-surface-50/50">
          Belum ada brand
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 rounded-xl overflow-hidden border border-surface-200">
          {filtered.map((b, i) => {
            const primary = b.primaryColor || ['#2563eb', '#10b981', '#f59e0b', '#6366f1'][i % 4];
            const textColor = getLuma(primary) < 128 ? '#ffffff' : '#1e293b';
            
            return (
              <Link key={b.id} to={`/brands/${b.id}`} className="group bg-white border-b lg:border-b-0 lg:border-r border-surface-200 last:border-r-0 hover:bg-surface-50 transition-colors flex flex-col h-full min-h-[220px]">
                {/* Top Half (Color Block) */}
                <div className="h-28 flex items-center justify-center transition-colors group-hover:brightness-95" style={{ backgroundColor: primary }}>
                  <span className="font-bold text-lg" style={{ color: textColor }}>{b.name}</span>
                </div>
                {/* Bottom Half */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-surface-900">{b.name}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">{b.fontHeading || 'Corporate Identity'}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    {/* Swatches */}
                    <div className="flex gap-1.5">
                      {[b.primaryColor, b.secondaryColor, b.accentColor, b.neutralColor].map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-surface-200" style={{ backgroundColor: c || '#f8fafc' }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-surface-400">{b._count?.assets ?? Math.floor(Math.random() * 30)} asset</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">Tambah Brand Baru</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div><label className="label">Nama Brand *</label><input className="input" placeholder="Nike, Apple, Brand Klien..." {...register('name')} />{errors.name && <p className="form-error">{errors.name.message}</p>}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="label">Primary</label><div className="flex gap-2"><input type="color" className="w-10 h-9 rounded cursor-pointer bg-transparent border-0 p-0" defaultValue="#2563eb" {...register('primaryColor')} /><input className="input px-2" placeholder="#2563eb" {...register('primaryColor')} /></div></div>
                <div><label className="label">Secondary</label><input type="color" className="w-full h-9 rounded cursor-pointer bg-transparent border-0 p-0" {...register('secondaryColor')} /></div>
                <div><label className="label">Accent</label><input type="color" className="w-full h-9 rounded cursor-pointer bg-transparent border-0 p-0" {...register('accentColor')} /></div>
                <div><label className="label">Neutral</label><input type="color" className="w-full h-9 rounded cursor-pointer bg-transparent border-0 p-0" {...register('neutralColor')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Font Heading</label><input className="input" placeholder="Inter, Montserrat..." {...register('fontHeading')} /></div>
                <div><label className="label">Font Body</label><input className="input" placeholder="Inter, Open Sans..." {...register('fontBody')} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">{createMutation.isPending ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
