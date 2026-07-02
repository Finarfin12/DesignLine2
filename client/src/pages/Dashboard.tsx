import { useQuery } from '@tanstack/react-query';
import { FileText, Plus, Upload, Palette, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const STATUS_LABEL_DASHBOARD: Record<string, string> = {
  draft: 'Draft', active: 'Aktif', review: 'Review', completed: 'Selesai',
};

export default function Dashboard() {
  const { data: projectsData } = useQuery({ queryKey: ['projects-all'], queryFn: () => api.get('/api/projects?limit=100').then(r => r.data) });
  const { data: assetsData } = useQuery({ queryKey: ['assets-all'], queryFn: () => api.get('/api/assets?limit=1').then(r => r.data) });
  const { data: emailsData } = useQuery({ queryKey: ['emails-recent'], queryFn: () => api.get('/api/email/logs?limit=5').then(r => r.data) });
  const { data: brands } = useQuery({ queryKey: ['brands-all'], queryFn: () => api.get('/api/brands').then(r => r.data) });

  const projects = projectsData?.projects ?? [];
  const active = projects.filter((p: any) => p.status === 'active').length;
  const completedThisMonth = projects.filter((p: any) => {
    if (p.status !== 'completed') return false;
    const completedDate = new Date(p.updatedAt);
    const now = new Date();
    return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
  }).length;
  const review = projects.filter((p: any) => p.status === 'review').length;
  const totalAssets = assetsData?.total ?? 0;

  const activeProjectsList = projects
    .filter((p: any) => p.status === 'active' || p.status === 'review')
    .slice(0, 5);

  // Combine recent projects and emails into a single activity timeline
  const recentActivity = [
    ...projects.map((p: any) => ({
      id: `p-${p.id}`,
      title: `${p.name} — status diubah menjadi ${p.status}`,
      time: p.updatedAt,
      color: p.status === 'completed' ? 'bg-emerald-500' : p.status === 'review' ? 'bg-amber-500' : 'bg-blue-500',
    })),
    ...(emailsData?.logs ?? []).map((e: any) => ({
      id: `e-${e.id}`,
      title: `Email ${e.subject} ${e.status === 'sent' ? 'berhasil dikirim' : 'gagal dikirim'} ke ${e.recipientEmail}`,
      time: e.sentAt,
      color: e.status === 'sent' ? 'bg-blue-500' : 'bg-red-500',
    })),
    ...(brands ?? []).map((b: any) => ({
      id: `b-${b.id}`,
      title: `Brand Library ${b.name} ditambahkan / diperbarui`,
      time: b.updatedAt,
      color: 'bg-purple-500',
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  const getRelativeTime = (dateString: string) => {
    const rtf = new Intl.RelativeTimeFormat('id', { numeric: 'auto' });
    const diffDays = Math.round((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === -1) return 'Kemarin';
    if (diffDays > -30) return rtf.format(diffDays, 'day');
    return format(new Date(dateString), 'd MMM', { locale: id });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" placeholder="Cari proyek..." className="input pl-9 rounded-full bg-surface-50 border-transparent focus:bg-white" />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 bg-white border border-surface-200 rounded-xl shadow-sm divide-y md:divide-y-0 md:divide-x divide-surface-200">
        <div className="p-6">
          <p className="text-sm font-medium text-surface-500 mb-1">Proyek Aktif</p>
          <p className="text-3xl font-bold text-surface-900">{active}</p>
        </div>
        <div className="p-6">
          <p className="text-sm font-medium text-surface-500 mb-1">Selesai Bulan Ini</p>
          <p className="text-3xl font-bold text-surface-900">{completedThisMonth}</p>
        </div>
        <div className="p-6">
          <p className="text-sm font-medium text-surface-500 mb-1">Menunggu Review</p>
          <p className="text-3xl font-bold text-surface-900">{review}</p>
        </div>
        <div className="p-6">
          <p className="text-sm font-medium text-surface-500 mb-1">Total Aset</p>
          <p className="text-3xl font-bold text-surface-900">{totalAssets}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between px-6 py-5 border-b border-surface-200">
            <h2 className="font-semibold text-surface-900">Proyek Aktif</h2>
            <Link to="/projects" className="text-xs font-medium text-surface-500 hover:text-surface-900">Lihat semua</Link>
          </div>
          <div className="divide-y divide-surface-100">
            {activeProjectsList.length === 0 ? (
              <div className="p-8 text-center text-surface-500">Belum ada proyek aktif</div>
            ) : activeProjectsList.map((p: any, i: number) => {
              const colors = ['bg-amber-700', 'bg-emerald-600', 'bg-amber-500', 'bg-blue-600', 'bg-red-600'];
              const stripColor = colors[i % colors.length];
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-surface-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-1 h-10 rounded-full ${stripColor}`} />
                    <div>
                      <p className="text-sm font-semibold text-surface-900 group-hover:text-primary-600 transition-colors">{p.name}</p>
                      <p className="text-xs text-surface-500">{p.client?.name ?? 'Klien Internal'} · {p.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={p.status === 'review' ? 'badge-review' : p.status === 'completed' ? 'badge-completed' : p.status === 'draft' ? 'badge-default' : 'badge-active'}>{STATUS_LABEL_DASHBOARD[p.status] || p.status}</span>
                    <span className="text-xs text-surface-400 w-16 text-right">
                      {p.deadline ? `${Math.max(0, Math.ceil((new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} hari` : '—'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="px-6 py-5 border-b border-surface-200">
            <h2 className="font-semibold text-surface-900">Aktivitas Terbaru</h2>
          </div>
          <div className="p-6 relative">
            {recentActivity.length > 0 && <div className="absolute left-[29px] top-8 bottom-8 w-px bg-surface-200" />}
            <div className="space-y-6">
              {recentActivity.length === 0 ? (
                <p className="text-center text-sm text-surface-500">Belum ada aktivitas.</p>
              ) : recentActivity.map((act) => (
                <div key={act.id} className="flex gap-4 relative z-10">
                  <div className={`w-2 h-2 mt-1.5 rounded-full ${act.color} ring-4 ring-white flex-shrink-0`} />
                  <div>
                    <p className="text-xs font-medium text-surface-900 leading-tight">{act.title}</p>
                    <p className="text-[10px] text-surface-500 font-mono mt-1">{getRelativeTime(act.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="px-6 py-4 border-b border-surface-200">
          <h2 className="font-semibold text-surface-900">Aksi Cepat</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-200">
          <Link to="/projects?new=true" className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-surface-700 hover:text-primary-600 text-sm font-medium">
            <Plus className="w-4 h-4 text-primary-500" /> Brief Baru
          </Link>
          <Link to="/assets?upload=true" className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-surface-700 hover:text-primary-600 text-sm font-medium border-t md:border-t-0 border-surface-200">
            <Upload className="w-4 h-4 text-primary-500" /> Upload Aset
          </Link>
          <Link to="/email?new=true" className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-surface-700 hover:text-primary-600 text-sm font-medium border-t border-surface-200">
            <FileText className="w-4 h-4 text-primary-500" /> Email Percetakan
          </Link>
          <Link to="/brands?new=true" className="flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-surface-700 hover:text-primary-600 text-sm font-medium border-t border-surface-200">
            <Palette className="w-4 h-4 text-primary-500" /> Tambah Brand
          </Link>
        </div>
      </div>
    </div>
  );
}
