import { useState, useRef, useEffect } from 'react';
import { Plus, X, Check, Palette } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { showAlert } from '../lib/alert';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Props {
  entityType: 'project' | 'asset' | 'client';
  entityId: string;
  tags: { tag: Tag }[];
  onTagsChanged?: () => void;
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b',
];

export default function TagManager({ entityType, entityId, tags, onTagsChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api.get('/api/tags').then(r => r.data),
  });

  const saveTags = useMutation({
    mutationFn: (tagIds: string[]) =>
      api.put(`/api/tags/${entityType}/${entityId}`, { tagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType + 's'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onTagsChanged?.();
    },
  });

  const createTag = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api.post('/api/tags', data),
    onSuccess: (res) => {
      const currentIds = tags.map(t => t.tag.id);
      saveTags.mutate([...currentIds, res.data.id]);
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (err: any) => showAlert.error('Gagal', err.response?.data?.error || 'Terjadi kesalahan'),
  });

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    // Check duplicate in user's tags
    if (allTags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      showAlert.error('Duplikat', 'Tag dengan nama tersebut sudah ada');
      return;
    }
    createTag.mutate({ name, color: newColor });
  };

  const toggleTag = (tagId: string) => {
    const currentIds = tags.map(t => t.tag.id);
    const newIds = currentIds.includes(tagId)
      ? currentIds.filter(id => id !== tagId)
      : [...currentIds, tagId];
    saveTags.mutate(newIds);
  };

  const isSelected = (tagId: string) => tags.some(t => t.tag.id === tagId);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map(({ tag }) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' }}
          >
            {tag.name}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-0.5 rounded-full border border-dashed border-surface-300 text-surface-400 hover:text-surface-700 hover:border-surface-400 transition-colors"
          title="Atur tag"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-surface-200 rounded-xl shadow-lg z-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Tag</p>

          {allTags.length === 0 && !showCreate && (
            <p className="text-xs text-surface-400 text-center py-2">Belum ada tag. Buat tag baru.</p>
          )}

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {allTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  isSelected(tag.id) ? 'bg-surface-100 font-medium' : 'hover:bg-surface-50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${isSelected(tag.id) ? 'border-0' : ''}`} style={{ backgroundColor: tag.color }} />
                <span className="flex-1 text-left text-surface-800">{tag.name}</span>
                {isSelected(tag.id) && <Check className="w-3.5 h-3.5 text-primary-600" />}
              </button>
            ))}
          </div>

          {showCreate ? (
            <div className="space-y-2 pt-2 border-t border-surface-200">
              <input
                type="text"
                className="input text-sm py-1.5"
                placeholder="Nama tag"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                autoFocus
              />
              <div className="flex flex-wrap gap-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${newColor === c ? 'border-surface-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary text-xs py-1.5 flex-1"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createTag.isPending || !newName.trim()}
                  className="btn-primary text-xs py-1.5 flex-1"
                >
                  {createTag.isPending ? '...' : 'Buat'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full text-xs text-primary-600 font-semibold hover:text-primary-700 pt-1"
            >
              + Buat Tag Baru
            </button>
          )}
        </div>
      )}
    </div>
  );
}
