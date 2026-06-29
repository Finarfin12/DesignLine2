import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, Maximize, Play, Pause, Image as ImageIcon } from 'lucide-react';
import api, { getFileUrl } from '../lib/api';

export default function PresentationMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch project data from public endpoint
  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project-public', id],
    queryFn: () => api.get(`/api/projects/public/${id}`).then(r => r.data),
    retry: false, // Don't retry if 404
  });

  const assets = project?.assets || [];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen().catch(console.error);
        } else {
          navigate(-1); // Go back
        }
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      }
      if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, assets.length, isFullscreen]);

  // Autoplay
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(nextSlide, 3000);
    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, assets.length]);

  const nextSlide = () => {
    if (assets.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % assets.length);
  };

  const prevSlide = () => {
    if (assets.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? assets.length - 1 : prev - 1));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-surface-800 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
        <ImageIcon className="w-16 h-16 opacity-50" />
        <h1 className="text-2xl font-bold">Proyek Tidak Ditemukan</h1>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-surface-800 hover:bg-surface-700 rounded-full transition-colors">
          Kembali
        </button>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
        <ImageIcon className="w-16 h-16 opacity-50" />
        <h1 className="text-2xl font-bold">Belum Ada Desain</h1>
        <p className="text-surface-400">Proyek ini belum memiliki aset desain untuk dipresentasikan.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-surface-800 hover:bg-surface-700 rounded-full transition-colors">
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col z-50 animate-fade-in select-none">
      {/* Header Overlay */}
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent z-10 transition-opacity duration-300 opacity-0 hover:opacity-100 group">
        <div>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <p className="text-sm text-surface-400">{project.client?.name || project.category}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Autoplay (3s)">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Fullscreen">
            <Maximize className="w-5 h-5" />
          </button>
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-full transition-colors" title="Tutup (Esc)">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Viewer */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {assets.map((asset: any, idx: number) => (
          <div
            key={asset.id}
            className={`absolute inset-0 transition-opacity duration-500 ease-in-out flex items-center justify-center p-8
              ${idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
          >
            <img 
              src={getFileUrl(asset.fileUrl)} 
              alt={asset.name}
              className="max-w-full max-h-full object-contain drop-shadow-2xl"
              draggable="false"
            />
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <button 
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-black/20 hover:bg-black/60 rounded-full text-white/50 hover:text-white transition-all z-20 backdrop-blur-sm"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-black/20 hover:bg-black/60 rounded-full text-white/50 hover:text-white transition-all z-20 backdrop-blur-sm"
      >
        <ChevronRight className="w-8 h-8" />
      </button>

      {/* Footer / Progress Indicator */}
      <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center z-10">
        <div className="flex gap-2">
          {assets.map((_: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
