import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, FolderOpen, Users, Palette, X } from 'lucide-react';
import api from '../lib/api';

export default function GlobalSearch({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return { projects: [], clients: [], brands: [], assets: [] };
      const res = await api.get('/api/search', { params: { q: query } });
      return res.data;
    },
    enabled: isOpen && query.length >= 2,
  });

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const flatResults = [
    ...(searchResults?.projects || []).map((r: any) => ({ ...r, _type: 'project' as const })),
    ...(searchResults?.clients || []).map((r: any) => ({ ...r, _type: 'client' as const })),
    ...(searchResults?.brands || []).map((r: any) => ({ ...r, _type: 'brand' as const })),
  ];
  const totalResults = flatResults.length;

  return (
    <div className="fixed inset-0 z-[100] bg-surface-900/50 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-surface-200 dark:border-slate-700 overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        
        {/* Search Input */}
        <div className="relative border-b border-surface-200 dark:border-slate-700">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent pl-12 pr-12 py-4 text-lg text-surface-900 dark:text-slate-100 placeholder-surface-400 focus:outline-none"
            placeholder="Cari proyek, klien, atau brand..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && flatResults[selectedIndex]) {
                const item = flatResults[selectedIndex];
                if (item._type === 'project') handleNavigate(`/projects/${item.id}`);
                else if (item._type === 'client') handleNavigate(`/projects?client=${item.id}`);
                else if (item._type === 'brand') handleNavigate(`/brands/${item.id}`);
              }
            }}
          />
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 dark:hover:text-slate-200 bg-surface-100 dark:bg-slate-800 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length < 2 ? (
            <div className="py-10 text-center text-surface-500 text-sm">
              Ketik minimal 2 karakter untuk mencari.
            </div>
          ) : isLoading ? (
            <div className="py-10 text-center text-surface-500 text-sm animate-pulse">
              Mencari...
            </div>
          ) : flatResults.length === 0 ? (
            <div className="py-10 text-center text-surface-500 text-sm">
              Tidak ada hasil yang cocok untuk "{query}".
            </div>
          ) : (
            <div className="p-2">
              {(() => {
                const sections: { label: string; key: string; items: any[]; icon: any; iconBg: string; iconColor: string; getPath: (item: any) => string }[] = [
                  { label: 'Proyek', key: 'projects', items: searchResults?.projects || [], icon: FolderOpen, iconBg: 'bg-primary-50 dark:bg-primary-900/20', iconColor: 'text-primary-600', getPath: (p: any) => `/projects/${p.id}` },
                  { label: 'Klien', key: 'clients', items: searchResults?.clients || [], icon: Users, iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600', getPath: (c: any) => `/projects?client=${c.id}` },
                  { label: 'Brands', key: 'brands', items: searchResults?.brands || [], icon: Palette, iconBg: 'bg-pink-50 dark:bg-pink-900/20', iconColor: 'text-pink-600', getPath: (b: any) => `/brands/${b.id}` },
                ];
                let idx = 0;
                return sections.map(section => {
                  if (section.items.length === 0) return null;
                  const sectionStart = idx;
                  idx += section.items.length;
                  const Icon = section.icon;
                  return (
                    <div key={section.key} className="mb-4 last:mb-0">
                      <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 px-2">{section.label}</h3>
                      <div className="space-y-1">
                        {section.items.map((item: any, i: number) => {
                          const globalIdx = sectionStart + i;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleNavigate(section.getPath(item))}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors group ${globalIdx === selectedIndex ? 'bg-surface-100 dark:bg-slate-800 ring-1 ring-primary-500/30' : 'hover:bg-surface-100 dark:hover:bg-slate-800'}`}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                            >
                              <div className={`w-8 h-8 rounded-lg ${section.iconBg} ${section.iconColor} flex items-center justify-center flex-shrink-0`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-surface-900 dark:text-slate-100 truncate">{item.name}</p>
                                <p className="text-xs text-surface-500 truncate">{item.category || item.company || item.email || ''}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-surface-50 dark:bg-slate-800 border-t border-surface-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between text-xs text-surface-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="bg-surface-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">↑↓</kbd> Navigasi</span>
            <span className="flex items-center gap-1"><kbd className="bg-surface-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">Enter</kbd> Pilih</span>
          </div>
          <span className="flex items-center gap-1"><kbd className="bg-surface-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> Tutup</span>
        </div>
      </div>
    </div>
  );
}
