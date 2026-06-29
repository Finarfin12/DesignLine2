import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRef, useState } from 'react';
import { ArrowLeft, Upload, Trash2, Edit3, Save, X } from 'lucide-react';
import api, { getFileUrl } from '../lib/api';

const brandSchema = z.object({
  name: z.string().min(1),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  neutralColor: z.string().optional(),
  fontHeading: z.string().optional(),
  fontBody: z.string().optional(),
});
type BrandForm = z.infer<typeof brandSchema>;

export default function BrandDetail() {
  const { id: brandId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const secondaryLogoRef = useRef<HTMLInputElement>(null);

  const { data: brand, isLoading } = useQuery({
    queryKey: ['brand', brandId],
    queryFn: () => api.get(`/api/brands/${brandId}`).then(r => r.data),
  });

  const { register, handleSubmit, reset } = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    values: brand ? { name: brand.name, primaryColor: brand.primaryColor ?? '', secondaryColor: brand.secondaryColor ?? '', accentColor: brand.accentColor ?? '', neutralColor: brand.neutralColor ?? '', fontHeading: brand.fontHeading ?? '', fontBody: brand.fontBody ?? '' } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: BrandForm) => api.put(`/api/brands/${brandId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brand', brandId] }); setEditing(false); },
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append('logo', file); return api.post(`/api/brands/${brandId}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand', brandId] }),
  });

  const uploadSecondaryLogo = useMutation({
    mutationFn: (file: File) => { const fd = new FormData(); fd.append('logo', file); return api.post(`/api/brands/${brandId}/secondary-logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand', brandId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/brands/${brandId}`),
    onSuccess: () => navigate('/brands'),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!brand) return <div className="text-center py-20 text-surface-400">Brand tidak ditemukan</div>;

  const colors = [
    { label: 'Primary', key: 'primaryColor', value: brand.primaryColor },
    { label: 'Secondary', key: 'secondaryColor', value: brand.secondaryColor },
    { label: 'Accent', key: 'accentColor', value: brand.accentColor },
    { label: 'Neutral', key: 'neutralColor', value: brand.neutralColor },
  ].filter(c => c.value);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/brands" className="btn-ghost btn-icon"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <h1 className="page-title">{brand.name}</h1>
          <p className="page-subtitle">{brand.assets?.length ?? 0} assets</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="btn-secondary"><Edit3 className="w-4 h-4" />Edit</button>
          <button onClick={() => setDeleteConfirm(true)} className="btn-danger"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-surface-900">Primary Logo</h2>
            <div className="aspect-square rounded-xl bg-surface-50 flex items-center justify-center overflow-hidden border border-surface-200">
              {brand.logoUrl ? (
                <img src={getFileUrl(brand.logoUrl)} alt={`${brand.name} Primary`} className="w-full h-full object-contain p-4" />
              ) : (
                <div className="text-6xl font-bold" style={{ color: brand.primaryColor || '#2563eb' }}>{brand.name.charAt(0)}</div>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLogo.mutate(e.target.files[0])} />
            <button onClick={() => logoRef.current?.click()} disabled={uploadLogo.isPending} className="btn-secondary w-full justify-center">
              <Upload className="w-4 h-4" />{uploadLogo.isPending ? 'Mengupload...' : 'Upload Primary Logo'}
            </button>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-surface-900">Secondary Logo</h2>
            <div className="aspect-square rounded-xl bg-surface-50 flex items-center justify-center overflow-hidden border border-surface-200">
              {brand.secondaryLogoUrl ? (
                <img src={getFileUrl(brand.secondaryLogoUrl)} alt={`${brand.name} Secondary`} className="w-full h-full object-contain p-4" />
              ) : (
                <div className="text-sm text-surface-400">Belum ada logo sekunder</div>
              )}
            </div>
            <input ref={secondaryLogoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadSecondaryLogo.mutate(e.target.files[0])} />
            <button onClick={() => secondaryLogoRef.current?.click()} disabled={uploadSecondaryLogo.isPending} className="btn-secondary w-full justify-center">
              <Upload className="w-4 h-4" />{uploadSecondaryLogo.isPending ? 'Mengupload...' : 'Upload Secondary Logo'}
            </button>
          </div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Color Palette */}
          {colors.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-surface-900 mb-4">Color Palette</h2>
              <div className="flex flex-wrap gap-3">
                {colors.map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-surface-200 shadow-sm" style={{ backgroundColor: value! }} />
                    <div>
                      <p className="text-xs text-surface-500 font-medium">{label}</p>
                      <p className="text-sm font-mono text-surface-900 mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typography */}
          {(brand.fontHeading || brand.fontBody) && (
            <div className="card p-5">
              <h2 className="font-semibold text-surface-900 mb-4">Typography</h2>
              <div className="space-y-3">
                {brand.fontHeading && (
                  <div className="flex items-center gap-4">
                    <div className="w-20 text-xs font-medium text-surface-500">Heading</div>
                    <div className="text-2xl font-bold text-surface-900" style={{ fontFamily: brand.fontHeading }}>{brand.fontHeading}</div>
                  </div>
                )}
                {brand.fontBody && (
                  <div className="flex items-center gap-4">
                    <div className="w-20 text-xs font-medium text-surface-500">Body</div>
                    <div className="text-base text-surface-700" style={{ fontFamily: brand.fontBody }}>{brand.fontBody} — The quick brown fox</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Form */}
          {editing && (
            <div className="card p-5 animate-slide-up">
              <h2 className="font-semibold text-surface-900 mb-4">Edit Brand</h2>
              <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-3">
                <div><label className="label">Nama Brand</label><input className="input" {...register('name')} /></div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {['primaryColor', 'secondaryColor', 'accentColor', 'neutralColor'].map((k, i) => (
                    <div key={k}><label className="label capitalize">{['Primary', 'Secondary', 'Accent', 'Neutral'][i]}</label>
                      <div className="flex gap-2"><input type="color" className="w-10 h-9 rounded bg-transparent border-0 p-0 cursor-pointer" {...register(k as keyof BrandForm)} /><input className="input px-2" placeholder="#000000" {...register(k as keyof BrandForm)} /></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label">Font Heading</label><input className="input" {...register('fontHeading')} /></div>
                  <div><label className="label">Font Body</label><input className="input" {...register('fontBody')} /></div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setEditing(false); reset(); }} className="btn-secondary"><X className="w-4 h-4" />Batal</button>
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary"><Save className="w-4 h-4" />{updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 animate-slide-up shadow-xl">
            <h2 className="text-lg font-bold text-surface-900 mb-2">Hapus Brand?</h2>
            <p className="text-sm text-surface-600 mb-5">Semua data brand termasuk logo akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} className="btn-danger flex-1 justify-center">{deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
