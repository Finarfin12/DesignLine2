import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Search, Upload, Trash2, X, Image, FileText, Type, Star, Pencil } from 'lucide-react';
import api, { getFileUrl } from '../lib/api';

const ASSET_TYPES = ['font', 'color', 'template', 'icon', 'image', 'mockup', 'palette'] as const;
const TYPE_ICONS: Record<string, React.ElementType> = { font: Type, template: FileText, icon: Star, image: Image, mockup: Package, color: Package, palette: Package };
const TYPE_COLORS: Record<string, string> = { font: 'text-violet-600 bg-violet-100', template: 'text-blue-600 bg-blue-100', icon: 'text-amber-600 bg-amber-100', image: 'text-emerald-600 bg-emerald-100', mockup: 'text-pink-600 bg-pink-100', color: 'text-orange-600 bg-orange-100', palette: 'text-orange-600 bg-orange-100' };

const uploadSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  type: z.enum(ASSET_TYPES),
  category: z.string().optional(),
  brandId: z.string().optional(),
});
type UploadForm = z.infer<typeof uploadSchema>;

interface Asset { id: string; name: string; type: string; fileUrl: string; fileSize: number; mimeType: string; usageCount: number; createdAt: string; metadata?: { colors?: string[]; description?: string }; brand?: { name: string } }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Assets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['assets', search, typeFilter],
    queryFn: () => api.get('/api/assets', { params: { search: search || undefined, type: typeFilter || undefined, limit: 50 } }).then(r => {
      return { ...r.data, assets: r.data.assets || [] };
    }),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands-all'],
    queryFn: () => api.get('/api/brands').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UploadForm>({ resolver: zodResolver(uploadSchema) });

  const uploadMutation = useMutation({
    mutationFn: (data: UploadForm) => {
      if (!selectedFile) throw new Error('No file');
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('name', data.name);
      fd.append('type', data.type);
      if (data.category) fd.append('category', data.category);
      if (data.brandId) fd.append('brandId', data.brandId);
      return api.post('/api/assets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); setShowUpload(false); setSelectedFile(null); reset(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); setDeleteId(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, metadata }: { id: string; name?: string; metadata?: any }) =>
      api.put(`/api/assets/${id}`, { name, metadata }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); setEditAsset(null); },
  });

  const assets: Asset[] = (data?.assets ?? []).filter((a: Asset) => a.type !== 'moodboard');
  const isImage = (mime?: string) => !!mime?.startsWith('image/');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-surface-900">Asset Library</h1>
        <div className="flex gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari asset..." className="input pl-9 rounded-md bg-surface-50 border-surface-200 focus:bg-white" />
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary rounded-md"><Upload className="w-4 h-4" /> Upload Asset</button>
        </div>
      </div>

      {/* Type Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['', ...ASSET_TYPES].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              typeFilter === t
                ? 'bg-primary-50 border border-primary-200 text-primary-700 shadow-sm'
                : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
            }`}
          >
            {t === '' ? 'Semua Asset' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : assets.length === 0 ? (
        <div className="card p-16 text-center border-dashed bg-surface-50/50">
          <Package className="w-12 h-12 mx-auto mb-3 text-surface-400" />
          <p className="text-surface-600 font-medium mb-3">Belum ada asset</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary btn-sm inline-flex"><Upload className="w-3 h-3" />Upload Sekarang</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assets.map(a => {
            const Icon = TYPE_ICONS[a.type] ?? Package;
            const colorClass = TYPE_COLORS[a.type] ?? 'text-surface-600 bg-surface-100';
            return (
              <div key={a.id} className="card group relative overflow-hidden bg-white hover:border-surface-300">
                {/* Thumbnail / Icon */}
                <div className="aspect-square bg-surface-50 flex items-center justify-center overflow-hidden border-b border-surface-200">
                  {a.type === 'palette' && a.metadata?.colors ? (
                    <div className="w-full h-full flex">
                      {a.metadata.colors.map((hex: string, i: number) => (
                        <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
                      ))}
                    </div>
                  ) : isImage(a.mimeType) ? (
                    <img src={getFileUrl(a.fileUrl)} alt={a.name} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105" />
                  ) : (
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${colorClass} transition-transform group-hover:scale-110 shadow-sm`}><Icon className="w-8 h-8" /></div>
                  )}
                </div>
                {/* Hover actions */}
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditAsset(a); setEditName(a.name); setEditDesc(a.metadata?.description || ''); }} className="btn-ghost btn-icon bg-white/90 backdrop-blur hover:bg-white shadow-sm" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(a.id)} className="btn-danger btn-icon shadow-sm" title="Hapus">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-surface-900 truncate" title={a.name}>{a.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colorClass}`}>{a.type}</span>
                    <span className="text-xs font-mono text-surface-400">{formatSize(a.fileSize)}</span>
                  </div>
                  {a.brand && <p className="text-[11px] font-medium text-surface-500 mt-2 truncate">Brand: {a.brand.name}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">Upload Asset</h2>
              <button onClick={() => setShowUpload(false)} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(d => uploadMutation.mutate(d))} className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${selectedFile ? 'border-primary-500 bg-primary-50' : 'border-surface-300 hover:border-surface-400 bg-surface-50'}`}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-surface-400" />
                {selectedFile ? <p className="text-sm text-primary-700 font-medium">{selectedFile.name}</p> : <p className="text-sm text-surface-600 font-medium">Klik untuk pilih file<br /><span className="text-xs text-surface-400 mt-1 block">PNG, JPG, SVG, PDF, AI, PSD, TTF, ZIP (max 50MB)</span></p>}
                <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); }} />
              </div>
              <div><label className="label">Nama Asset *</label><input className="input" placeholder="Logo ABC Horizontal" {...register('name')} />{errors.name && <p className="form-error">{errors.name.message}</p>}</div>
              <div><label className="label">Tipe *</label>
                <select className="select" {...register('type')}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="label">Kategori</label><input className="input" placeholder="misal: Header, Icon Set, Template A3..." {...register('category')} /></div>
              <div>
                <label className="label">Brand (Opsional)</label>
                <select className="select" {...register('brandId')}>
                  <option value="">Tidak ditautkan ke Brand</option>
                  {(brands || []).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUpload(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={!selectedFile || uploadMutation.isPending} className="btn-primary flex-1 justify-center">{uploadMutation.isPending ? 'Mengupload...' : 'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 animate-slide-up shadow-xl">
            <h2 className="text-lg font-bold text-surface-900 mb-2">Hapus Asset?</h2>
            <p className="text-sm text-surface-600 mb-5">File akan dihapus permanen dari server.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} className="btn-danger flex-1 justify-center">{deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editAsset && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditAsset(null)}>
          <div className="card w-full max-w-md p-6 animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-surface-900 mb-5">Edit Asset</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nama</label>
                <input className="input" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea
                  className="input w-full min-h-[100px] resize-none"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditAsset(null)} className="btn-secondary flex-1">Batal</button>
                <button
                  onClick={() => {
                    const data: any = {};
                    if (editName.trim() && editName.trim() !== editAsset.name) data.name = editName.trim();
                    const oldDesc = editAsset.metadata?.description || '';
                    if (editDesc.trim() !== oldDesc) data.metadata = { ...editAsset.metadata, description: editDesc.trim() };
                    if (Object.keys(data).length > 0) updateMutation.mutate({ id: editAsset.id, ...data });
                    else setEditAsset(null);
                  }}
                  disabled={updateMutation.isPending}
                  className="btn-primary flex-1 justify-center"
                >
                  {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
