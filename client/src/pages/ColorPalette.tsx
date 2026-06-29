import { useState } from 'react';
import { Upload, Copy, RefreshCcw, Palette, Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { showAlert } from '../lib/alert';

export default function ColorPalette() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [paletteName, setPaletteName] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: savedPalettes = [] } = useQuery({
    queryKey: ['palettes'],
    queryFn: () => api.get('/api/assets', { params: { type: 'palette', limit: 100 } }).then(r => r.data.assets || []),
  });

  const savePalette = useMutation({
    mutationFn: () =>
      api.post('/api/assets/link', {
        name: paletteName || `Palette ${new Date().toLocaleDateString()}`,
        type: 'palette',
        fileUrl: `/palettes/${Date.now()}`,
        metadata: { colors: palette }
      }),
    onSuccess: () => {
      showAlert.success('Berhasil', 'Palet berhasil disimpan!');
      setPaletteName('');
      queryClient.invalidateQueries({ queryKey: ['palettes'] });
    }
  });

  const deletePalette = useMutation({
    mutationFn: (id: string) => api.delete(`/api/assets/${id}`),
    onSuccess: () => {
      showAlert.success('Berhasil', 'Palet berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['palettes'] });
    },
    onError: () => showAlert.error('Gagal', 'Gagal menghapus palet'),
  });

  const confirmDelete = (p: any) => {
    showAlert.confirm('Hapus Palet', `Yakin ingin menghapus "${p.name}"?`, () => deletePalette.mutate(p.id));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    extractColors(url);
  };

  const extractColors = (url: string) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const MAX = 200;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * (MAX / w)); w = MAX; }
        else { w = Math.round(w * (MAX / h)); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const data = ctx.getImageData(0, 0, w, h).data;
      const rgbValues: { r: number; g: number; b: number }[] = [];

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] >= 125) {
          rgbValues.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
        }
      }

      const bins: Record<string, { r: number; g: number; b: number; count: number }> = {};
      const step = 64;

      rgbValues.forEach(c => {
        const rBin = Math.floor(c.r / step) * step + step/2;
        const gBin = Math.floor(c.g / step) * step + step/2;
        const bBin = Math.floor(c.b / step) * step + step/2;
        const key = `${rBin},${gBin},${bBin}`;

        if (!bins[key]) {
          bins[key] = { r: 0, g: 0, b: 0, count: 0 };
        }
        bins[key].r += c.r;
        bins[key].g += c.g;
        bins[key].b += c.b;
        bins[key].count++;
      });

      const sortedBins = Object.values(bins).sort((a, b) => b.count - a.count);

      const finalColors: string[] = [];
      for (const bin of sortedBins) {
        if (finalColors.length >= 6) break;
        const avgR = Math.round(bin.r / bin.count);
        const avgG = Math.round(bin.g / bin.count);
        const avgB = Math.round(bin.b / bin.count);

        const hex = '#' + [avgR, avgG, avgB].map(x => x.toString(16).padStart(2,'0')).join('');

        let isDistinct = true;
        for (const existingHex of finalColors) {
          const exR = parseInt(existingHex.slice(1,3), 16);
          const exG = parseInt(existingHex.slice(3,5), 16);
          const exB = parseInt(existingHex.slice(5,7), 16);
          const dist = Math.abs(avgR - exR) + Math.abs(avgG - exG) + Math.abs(avgB - exB);
          if (dist < 40) {
            isDistinct = false;
            break;
          }
        }

        if (isDistinct) finalColors.push(hex);
      }

      if (finalColors.length < 5) {
        for (const bin of sortedBins) {
           if (finalColors.length >= 6) break;
           const hex = '#' + [Math.round(bin.r/bin.count), Math.round(bin.g/bin.count), Math.round(bin.b/bin.count)].map(x => x.toString(16).padStart(2,'0')).join('');
           if (!finalColors.includes(hex)) finalColors.push(hex);
        }
      }

      setPalette(finalColors);
      setIsProcessing(false);
    };
    img.src = url;
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2"><Palette className="w-6 h-6 text-primary-500" /> Color Palette Generator</h1>
          <p className="text-surface-500 text-sm mt-1">Ekstrak palet warna yang harmonis dari gambar atau foto referensimu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="card p-6 flex flex-col h-[400px]">
          <h2 className="font-semibold text-surface-900 mb-4">Gambar Referensi</h2>

          {imageUrl ? (
            <div className="flex-1 relative group rounded-xl overflow-hidden bg-surface-100 border border-surface-200">
              <img src={imageUrl} alt="Uploaded reference" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-surface-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <label className="btn-primary cursor-pointer">
                  <RefreshCcw className="w-4 h-4" /> Ganti Gambar
                  <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-surface-300 rounded-xl bg-surface-50 hover:bg-surface-100 hover:border-primary-400 cursor-pointer transition-colors group">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-primary-500" />
              </div>
              <p className="font-semibold text-surface-900">Upload Gambar</p>
              <p className="text-sm text-surface-500 mt-1 text-center px-6">Seret & lepas gambar ke sini atau klik untuk memilih file (JPG, PNG).</p>
              <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            </label>
          )}
        </div>

        {/* Results Section */}
        <div className="card p-6 flex flex-col h-[400px]">
          <h2 className="font-semibold text-surface-900 mb-4">Palet Hasil Ekstraksi</h2>

          {!imageUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <ImageIcon className="w-12 h-12 text-surface-300 mb-3" />
              <p className="text-surface-500 text-sm">Palet warna akan muncul di sini setelah kamu mengunggah gambar referensi.</p>
            </div>
          ) : isProcessing ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-surface-500 text-sm">Menganalisis piksel gambar...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Color Swatches - fixed height horizontal bar */}
              <div className="flex rounded-xl overflow-hidden h-48 shadow-sm border border-surface-200">
                {palette.map((hex, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end pb-4 cursor-pointer hover:flex-[1.3] transition-all duration-200 group relative"
                    style={{ backgroundColor: hex }}
                    onClick={() => copyHex(hex)}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-white/90 backdrop-blur text-surface-900 text-xs font-bold px-2 py-1 rounded shadow-sm">
                        {copied === hex ? 'DISALIN!' : hex.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Form - separated from swatches */}
              <div className="mt-4 pt-4 border-t border-surface-200">
                <label className="text-sm font-semibold text-surface-900 mb-2 block">Simpan Palet</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input flex-1"
                    placeholder="Nama Palet (mis: Sunset Tropis)"
                    value={paletteName}
                    onChange={e => setPaletteName(e.target.value)}
                  />
                  <button
                    className="btn-primary shrink-0"
                    disabled={savePalette.isPending}
                    onClick={() => savePalette.mutate()}
                  >
                    {savePalette.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Saved Palettes */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-surface-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary-500" />
          Palet Tersimpan
        </h2>
        {savedPalettes.length === 0 ? (
          <div className="text-center p-8 bg-surface-50 rounded-xl border border-surface-200 text-surface-500">
            Belum ada palet yang disimpan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {savedPalettes.map((p: any) => (
              <div key={p.id} className="card p-4 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-surface-900">{p.name}</h3>
                    <p className="text-xs text-surface-500">Disimpan {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => confirmDelete(p)}
                    disabled={deletePalette.isPending}
                    className="btn-secondary text-xs py-1.5 px-3 text-red-500 border-red-200 hover:bg-red-50"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 rounded-xl overflow-hidden flex h-20 w-full shadow-sm">
                  {p.metadata?.colors?.map((hex: string, i: number) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col justify-end p-2 transition-all hover:flex-[1.5] group relative cursor-pointer"
                      style={{ backgroundColor: hex }}
                      onClick={() => copyHex(hex)}
                      title={`Copy ${hex}`}
                    >
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 relative z-10 text-center">
                        <span className={`bg-white/90 backdrop-blur text-surface-900 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm mix-blend-luminosity ${copied === hex ? 'text-emerald-600' : ''}`}>
                          {copied === hex ? 'DISALIN!' : hex.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
