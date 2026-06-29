import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, LayoutGrid, List, Coffee, BookOpen, Leaf, Briefcase, Smartphone, GraduationCap } from 'lucide-react';
import api from '../lib/api';

const ICONS: Record<string, React.ElementType> = {
  Logo: Coffee, Brochure: BookOpen, Poster: GraduationCap, Packaging: Leaf, Digital: Smartphone, 'UI/UX': Briefcase, Other: Coffee
};
const BG_COLORS = ['bg-orange-50', 'bg-indigo-50', 'bg-emerald-50', 'bg-rose-50', 'bg-pink-50', 'bg-slate-100'];

export default function Archive() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading } = useQuery({
    queryKey: ['archive', search, category],
    queryFn: () => api.get('/api/projects', {
      params: { search: search || undefined, category: category || undefined, status: 'completed', limit: 100 }
    }).then(r => r.data),
  });

  const projects = data?.projects ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-surface-900">Arsip</h1>
        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari arsip..." className="input pl-9 rounded-md bg-surface-50 border-surface-200 focus:bg-white" />
          </div>
          <div className="flex bg-surface-100 p-1 rounded-md">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-sm ${viewMode === 'grid' ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-500 hover:text-surface-900'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-sm ${viewMode === 'list' ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-500 hover:text-surface-900'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-surface-200">
        <button onClick={() => setCategory('')} className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${category === '' ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-500 hover:text-surface-900'}`}>Semua ({data?.total ?? 0})</button>
        {['Logo', 'Brochure', 'Poster', 'Packaging', 'Digital'].map(c => (
          <button key={c} onClick={() => setCategory(c)} className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${category === c ? 'border-primary-600 text-primary-600' : 'border-transparent text-surface-500 hover:text-surface-900'}`}>{c}</button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : projects.length === 0 ? (
        <div className="card p-16 text-center text-surface-500 border-dashed bg-surface-50/50">
          Belum ada arsip
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 rounded-xl overflow-hidden border border-surface-200">
          {projects.map((p: any, i: number) => {
            const Icon = ICONS[p.category] || Coffee;
            const bgClass = BG_COLORS[i % BG_COLORS.length];
            return (
              <Link key={p.id} to={`/projects/${p.id}`} className="group bg-white border-b lg:border-b-0 lg:border-r border-surface-200 last:border-r-0 hover:bg-surface-50 transition-colors flex flex-col h-full min-h-[240px]">
                {/* Top Half */}
                <div className={`h-32 ${bgClass} flex items-center justify-center transition-colors group-hover:brightness-95`}>
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <Icon className="w-5 h-5 text-surface-600" />
                  </div>
                </div>
                {/* Bottom Half */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-surface-900">{p.name}</h3>
                    <p className="text-xs text-surface-500 mt-1">{p.client?.name ?? p.category} · Selesai {new Date(p.updatedAt).getFullYear()}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-1.5">
                      <span className="px-1.5 py-0.5 bg-surface-100 text-surface-600 text-[10px] font-bold rounded uppercase tracking-wider">{p.category}</span>
                      {p.brief?.projectType && <span className="px-1.5 py-0.5 bg-surface-100 text-surface-600 text-[10px] font-bold rounded uppercase tracking-wider">{p.brief.projectType.split(' ')[0]}</span>}
                    </div>
                    <span className="text-[10px] font-mono text-surface-400">{p.assets?.length ?? 0} file</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Nama Proyek</th><th>Kategori</th><th>Klien</th><th>Update</th></tr></thead>
            <tbody>
              {projects.map((p: any) => (
                <tr key={p.id} className="cursor-pointer" onClick={() => window.location.href = `/projects/${p.id}`}>
                  <td className="font-medium text-surface-900">{p.name}</td>
                  <td className="text-surface-500">{p.category}</td>
                  <td className="text-surface-500">{p.client?.name ?? '—'}</td>
                  <td className="text-surface-500">{new Date(p.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
