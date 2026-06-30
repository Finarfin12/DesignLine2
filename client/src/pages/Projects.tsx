import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Plus, X, LayoutGrid, Layout } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import api from '../lib/api';

const projectSchema = z.object({
  name: z.string().min(1, 'Nama proyek wajib diisi'),
  category: z.enum(['Logo', 'Brochure', 'Poster', 'Packaging', 'Digital', 'UI/UX', 'Other']),
  status: z.enum(['draft', 'active', 'review', 'completed']),
});
type ProjectForm = z.infer<typeof projectSchema>;

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'review', label: 'Review' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Selesai' },
];

const STATUS_COLOR_TOP: Record<string, string> = {
  active: 'border-t-emerald-500', completed: 'border-t-blue-500',
  review: 'border-t-amber-500', draft: 'border-t-surface-400',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active', completed: 'badge-completed',
  review: 'badge-review', draft: 'badge-default',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif', completed: 'Selesai', review: 'Review', draft: 'Draft',
};

const KANBAN_COLUMNS = ['draft', 'active', 'review', 'completed'];

function KanbanCard({ project }: { project: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id, data: { project } });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 } : undefined;

  return (
    <Link
      ref={setNodeRef}
      to={`/projects/${project.id}`}
      {...listeners}
      {...attributes}
      style={style}
      className={`card-hover p-4 border-t-[3px] ${STATUS_COLOR_TOP[project.status] || 'border-t-surface-400'} flex flex-col ${isDragging ? 'opacity-50 shadow-2xl rotate-2' : ''}`}
      onClick={e => { if (isDragging) e.preventDefault(); }}
    >
      <h3 className="text-sm font-bold text-surface-900 mb-1 leading-tight">{project.name}</h3>
      <p className="text-xs font-medium text-surface-500 mb-3">{project.client?.name ?? project.category}</p>
      <div className="flex items-center justify-between border-t border-surface-100 pt-3">
        <span className="px-2 py-1 bg-surface-50 text-surface-500 text-[9px] font-semibold rounded uppercase tracking-wider">{project.category}</span>
        {project.deadline && <span className="text-[10px] font-mono text-surface-400">{Math.max(0, Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} hr</span>}
      </div>
    </Link>
  );
}

function KanbanColumn({ status, projects }: { status: string; projects: any[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { column: status } });

  return (
    <div
      ref={setNodeRef}
      className={`w-80 flex-shrink-0 rounded-xl p-3 flex flex-col gap-3 transition-colors ${isOver ? 'bg-primary-50 ring-2 ring-primary-200' : 'bg-surface-100'}`}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-surface-900 text-sm">{STATUS_LABEL[status]}</h3>
        <span className="text-xs font-semibold text-surface-500 bg-surface-200 px-2 py-0.5 rounded-full">{projects.length}</span>
      </div>
      {projects.map((p: any) => (<KanbanCard key={p.id} project={p} />))}
      {projects.length === 0 && <div className="text-center p-4 text-xs text-surface-400 border border-dashed border-surface-200 rounded-lg">Kosong</div>}
    </div>
  );
}

export default function Projects() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowModal(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { status: 'active' },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectForm) => api.post('/api/projects', data),
    onSuccess: (res) => { 
      qc.invalidateQueries({ queryKey: ['projects'] }); 
      setShowModal(false); 
      reset();
      navigate(`/projects/${res.data.id}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/projects/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => api.get('/api/projects', {
      params: { search: search || undefined, limit: 100 }
    }).then(r => r.data),
  });

  const projects = data?.projects ?? [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const projectId = active.id as string;
    const overCol = over.data?.current?.column;
    if (!overCol) return;
    updateStatus.mutate({ id: projectId, status: overCol });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-surface-900">Brief Proyek</h1>
        <div className="flex gap-3">
          <div className="bg-surface-100 p-1 rounded-lg flex gap-1">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-700'}`} title="Grid View"><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-700'}`} title="Kanban Board"><Layout className="w-4 h-4" /></button>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari brief..." className="input pl-9 rounded-full bg-surface-50 border-transparent focus:bg-white" />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary rounded-full px-5"><Plus className="w-4 h-4" /> Brief Baru</button>
        </div>
      </div>

      {/* Filter Tabs — only in grid mode */}
      {viewMode === 'grid' && (
        <div className="flex gap-2">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                status === tab.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid or Kanban */}
      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : viewMode === 'kanban' ? (
        <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
            {KANBAN_COLUMNS.map(colStatus => {
              const colProjects = projects.filter((p: any) => p.status === colStatus);
              return <KanbanColumn key={colStatus} status={colStatus} projects={colProjects} />;
            })}
          </div>
          <DragOverlay>
            {activeId ? <div className="card-hover p-4 border-t-[3px] bg-white shadow-2xl rotate-2 opacity-90"><p className="text-sm font-bold text-surface-900">{projects.find((p: any) => p.id === activeId)?.name}</p></div> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.filter((p: any) => !status || p.status === status).map((p: any) => (
            <Link key={p.id} to={`/projects/${p.id}`} className={`card-hover p-6 border-t-[3px] ${STATUS_COLOR_TOP[p.status] || 'border-t-surface-400'} flex flex-col h-full`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-surface-900">{p.name}</h3>
                  <p className="text-xs font-medium text-surface-500">{p.client?.name ?? p.category}</p>
                </div>
                <span className={STATUS_BADGE[p.status] || 'badge-default'}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.status === 'active' ? 'bg-emerald-500' : p.status === 'review' ? 'bg-amber-500' : 'bg-surface-400'}`} />
                  {STATUS_LABEL[p.status] || p.status}
                </span>
              </div>
              <p className="text-sm text-surface-600 line-clamp-2 my-4 flex-1">
                {p.brief?.description || p.notes || 'Tidak ada deskripsi tersedia untuk proyek ini. Klik untuk menambah brief.'}
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-surface-100">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-surface-50 text-surface-500 text-[10px] font-semibold rounded uppercase tracking-wider">{p.category}</span>
                </div>
                <span className="text-xs font-mono text-surface-400">
                  {p.deadline ? `${Math.max(0, Math.ceil((new Date(p.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} hari lagi` : '—'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md p-6 animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">Buat Proyek / Brief Baru</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Nama Proyek *</label>
                <input className="input" placeholder="misal: Rebranding WNB" {...register('name')} />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">Kategori *</label>
                <select className="select" {...register('category')}>
                  <option value="Logo">Logo</option>
                  <option value="Brochure">Brochure</option>
                  <option value="Poster">Poster</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Digital">Digital</option>
                  <option value="UI/UX">UI/UX Design</option>
                  <option value="Other">Other</option>
                </select>
                {errors.category && <p className="form-error">{errors.category.message}</p>}
              </div>
              <div>
                <label className="label">Status Awal</label>
                <select className="select" {...register('status')}>
                  <option value="draft">Draft (Persiapan)</option>
                  <option value="active">Aktif (Sedang Berjalan)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">{createMutation.isPending ? 'Menyimpan...' : 'Buat Proyek'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
