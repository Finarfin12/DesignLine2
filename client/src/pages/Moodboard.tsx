import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Type, X, Upload, Trash2, ZoomIn, ZoomOut, Maximize2, ExternalLink, Pencil } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api, { getFileUrl } from '../lib/api';
import { showAlert } from '../lib/alert';

function SortableMoodboardItem({ item, onView, onDelete }: { item: any; onView: (item: any) => void; onDelete: (item: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative aspect-[4/5] rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing shadow-sm border border-surface-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${isDragging ? 'scale-105 shadow-2xl' : ''}`}
    >
      {item.type === 'color' ? (
        <div className="w-full h-full flex flex-col justify-end p-5" style={{ backgroundColor: item.metadata?.hex || item.fileUrl || '#000' }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
          <div className="relative z-10">
            <p className="text-white font-mono text-sm mb-1">{item.metadata?.hex || item.name}</p>
            <p className="text-white/90 font-semibold text-sm truncate">{item.name}</p>
          </div>
        </div>
      ) : item.type === 'font' ? (
        <div className="w-full h-full bg-surface-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute inset-0 bg-gradient-to-t from-surface-900/60 via-transparent to-transparent opacity-80" />
          <Type className="w-8 h-8 text-surface-400 mb-4" />
          <p className="text-xl font-serif text-surface-900 mb-1">{item.name}</p>
          <div className="relative z-10 absolute bottom-5 left-5 right-5 text-left">
             <p className="text-white font-medium text-xs truncate">{item.category}</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-surface-100 flex flex-col items-center justify-center relative">
          {item.fileUrl ? (
            <img src={getFileUrl(item.fileUrl)} alt={item.name} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full pattern-diagonal-lines pattern-surface-200 pattern-bg-surface-50 pattern-size-4" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-900/80 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 z-10">
            <p className="text-white font-bold text-sm truncate">{item.name}</p>
            {item.metadata?.description && (
              <p className="text-white/70 text-xs truncate mt-0.5">{item.metadata.description}</p>
            )}
          </div>
          <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onView(item); }} className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white text-surface-700 hover:text-primary-600" title="Lihat detail"><Maximize2 className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white text-surface-700 hover:text-red-600" title="Hapus"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Moodboard() {
  const qc = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');

  // Detail / lightbox state
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);
  const [editModal, setEditModal] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const query = useQuery({
    queryKey: ['assets', 'moodboard'],
    queryFn: () => api.get('/api/assets', { params: { limit: 100 } }).then(r => {
      const data = r.data.assets || [];
      const filtered = data.filter((a: any) => a.type === 'moodboard');
      return filtered.sort((a: any, b: any) => (a.metadata?.order || 0) - (b.metadata?.order || 0));
    }),
  });

  const [items, setItems] = useState<any[]>(query.data ?? []);

  // Sync items when query refetches (after mutations / navigation)
  useEffect(() => { if (query.data) setItems(query.data); }, [query.data]);

  const reorderMutation = useMutation({
    mutationFn: async (newOrder: any[]) => {
      const promises = newOrder.map((item, index) =>
        api.put(`/api/assets/${item.id}`, { metadata: { ...item.metadata, order: index } })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', 'moodboard'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/assets/${id}`),
    onSuccess: () => {
      showAlert.success('Berhasil', 'Item berhasil dihapus');
      if (viewItem) setViewItem(null);
      qc.invalidateQueries({ queryKey: ['assets', 'moodboard'] });
    },
    onError: () => {
      showAlert.error('Gagal', 'Gagal menghapus item');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, name, metadata }: { id: string; name?: string; metadata?: any }) =>
      api.put(`/api/assets/${id}`, { name, metadata }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', 'moodboard'] });
    },
    onError: () => {
      showAlert.error('Gagal', 'Gagal menyimpan perubahan');
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newArray = arrayMove(items, oldIndex, newIndex);
        reorderMutation.mutate(newArray);
        return newArray;
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const title = itemTitle.trim() || e.target.files[0].name.replace(/\.[^.]+$/, '');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      formData.append('name', title);
      formData.append('type', 'moodboard');
      formData.append('metadata', JSON.stringify({ order: items.length, description: itemDescription.trim() }));

      await api.post('/api/assets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsAddModalOpen(false);
      setItemTitle('');
      setItemDescription('');
      qc.invalidateQueries({ queryKey: ['assets', 'moodboard'] });
    } catch (error) {
      console.error(error);
      showAlert.error('Gagal', 'Gagal mengunggah item');
    } finally {
      setUploading(false);
    }
  };

  const handleView = (item: any) => {
    setViewItem(item);
    setZoom(1);
  };

  const openEdit = (item: any) => {
    setEditModal(item);
    setEditTitle(item.name);
    setEditDesc(item.metadata?.description || '');
  };

  const saveEdit = () => {
    if (!editModal) return;
    const data: any = {};
    if (editTitle.trim() && editTitle.trim() !== editModal.name) data.name = editTitle.trim();
    const newDesc = editDesc.trim();
    const oldDesc = editModal.metadata?.description || '';
    if (newDesc !== oldDesc) data.metadata = { ...editModal.metadata, description: newDesc };
    if (Object.keys(data).length === 0) { setEditModal(null); return; }
    updateItemMutation.mutate({ id: editModal.id, ...data });
    setViewItem((prev: any) => prev ? { ...prev, ...data } : null);
    setEditModal(null);
  };

  const handleDelete = (item: any) => {
    showAlert.confirm(
      'Hapus Item',
      `Yakin ingin menghapus "${item.name}"?`,
      () => deleteMutation.mutate(item.id)
    );
  };

  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 5));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));
  const resetZoom = () => setZoom(1);

  if (query.isLoading && items.length === 0) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Global Moodboard</h1>
          <p className="text-surface-500 mt-2">{items.length} item tersimpan — Kumpulan ide, warna, font, dan referensi</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Tambah Item</button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {items.map((item) => (
              <SortableMoodboardItem key={item.id} item={item} onView={handleView} onDelete={handleDelete} />
            ))}

            <div onClick={() => setIsAddModalOpen(true)} className="aspect-[4/5] rounded-2xl border-2 border-dashed border-surface-300 flex flex-col items-center justify-center text-surface-400 hover:text-primary-500 hover:border-primary-400 hover:bg-primary-50 cursor-pointer transition-colors">
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Add New Item</span>
            </div>
          </div>
        </SortableContext>
      </DndContext>

      {/* Modal Add Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-surface-900">Tambah Item Moodboard</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-surface-400 hover:text-surface-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Judul item"
                className="input w-full"
                value={itemTitle}
                onChange={e => setItemTitle(e.target.value)}
              />
              <textarea
                placeholder="Deskripsi (opsional)"
                className="input w-full min-h-[80px] resize-none"
                value={itemDescription}
                onChange={e => setItemDescription(e.target.value)}
              />
              <label className="border-2 border-dashed border-surface-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-surface-50 hover:border-primary-400 transition-colors">
                <Upload className="w-10 h-10 text-primary-500 mb-3" />
                <p className="text-surface-900 font-medium mb-1">Upload Gambar Referensi</p>
                <p className="text-surface-500 text-sm">PNG, JPG, SVG hingga 10MB</p>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              </label>

              {uploading && (
                <div className="text-center text-primary-600 font-medium animate-pulse">
                  Mengunggah item...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Catatan */}
      {/* Detail / Lightbox Modal */}
      {viewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewItem(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden w-full max-w-5xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Toolbar */}
            <div className="flex items-start justify-between px-5 py-3 border-b border-surface-200 gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-surface-900 truncate">{viewItem.name}</h3>
                {viewItem.metadata?.description && (
                  <p className="text-sm text-surface-500 mt-0.5 truncate">{viewItem.metadata.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(viewItem)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-100 text-surface-600 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={zoomOut} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-100 text-surface-600 transition-colors" title="Perkecil"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-sm font-medium text-surface-600 w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
                <button onClick={zoomIn} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-100 text-surface-600 transition-colors" title="Perbesar"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={resetZoom} className="text-xs text-surface-500 hover:text-surface-900 px-2 py-1 rounded hover:bg-surface-100 transition-colors" title="Reset zoom">Reset</button>
                <div className="w-px h-6 bg-surface-200 mx-2" />
                <a
                  href={getFileUrl(viewItem.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-100 text-surface-600 transition-colors"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(viewItem)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewItem(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-100 text-surface-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Image area */}
            <div className="flex-1 overflow-auto bg-surface-50 flex items-center justify-center p-4" style={{ minHeight: 300 }}>
              <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease' }}>
                {viewItem.fileUrl ? (
                  <img
                    src={getFileUrl(viewItem.fileUrl)}
                    alt={viewItem.name}
                    className="max-w-full max-h-[70vh] rounded-lg shadow-xl"
                    draggable={false}
                  />
                ) : (
                  <div className="w-48 h-48 pattern-diagonal-lines pattern-surface-300 pattern-bg-surface-200 pattern-size-4 rounded-lg" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-surface-900">Edit Item</h3>
              <button onClick={() => setEditModal(null)} className="text-surface-400 hover:text-surface-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-surface-900 mb-1.5">Judul</label>
                <input
                  type="text"
                  className="input w-full"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-surface-900 mb-1.5">Deskripsi</label>
                <textarea
                  className="input w-full min-h-[100px] resize-none"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditModal(null)} className="btn-secondary flex-1">Batal</button>
                <button onClick={saveEdit} className="btn-primary flex-1">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
