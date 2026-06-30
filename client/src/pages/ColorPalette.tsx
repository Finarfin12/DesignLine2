import { useState } from 'react';
import { Upload, Copy, RefreshCcw, Palette, Image as ImageIcon, Save, Trash2, Plus, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { showAlert } from '../lib/alert';

function isLightColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function hexToHsl(hex: string): [number, number, number] {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export default function ColorPalette() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [paletteName, setPaletteName] = useState<string>('');
  const [hexInput, setHexInput] = useState('');
  const [pickerH, setPickerH] = useState(0);
  const [pickerS, setPickerS] = useState(100);
  const [pickerL, setPickerL] = useState(50);
  const [pickerHexInput, setPickerHexInput] = useState('');

  const pickerHex = hslToHex(pickerH, pickerS, pickerL);
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

  const addHexColor = () => {
    let hex = hexInput.trim();
    if (!hex) return;
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      showAlert.error('Format Salah', 'Gunakan format hex yang valid (mis: #FF5733)');
      return;
    }
    if (hex.length === 4) {
      hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    if (palette.includes(hex.toUpperCase())) {
      showAlert.error('Duplikat', 'Warna ini sudah ada di palet');
      return;
    }
    setPalette(prev => [...prev, hex.toUpperCase()]);
    setHexInput('');
  };

  const removeHexColor = (index: number) => {
    setPalette(prev => prev.filter((_, i) => i !== index));
  };

  const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addHexColor();
    }
  };

  const handlePickerHexChange = (value: string) => {
    setPickerHexInput(value);
    if (/^#([0-9A-Fa-f]{6})$/.test(value)) {
      try {
        const [h, s, l] = hexToHsl(value.toUpperCase());
        setPickerH(h); setPickerS(s); setPickerL(l);
      } catch { /* ignore invalid */ }
    }
  };

  const resetPicker = () => {
    setPickerH(0); setPickerS(100); setPickerL(50);
    setPickerHexInput('');
  };

  const addPickerColor = () => {
    if (pickerHex === '#FF0000' && pickerS === 100 && pickerL === 50 && pickerH === 0 && palette.length === 0) {
      // default red, probably intentional
    }
    if (palette.includes(pickerHex)) {
      showAlert.error('Duplikat', 'Warna ini sudah ada di palet');
      return;
    }
    setPalette(prev => [...prev, pickerHex]);
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
          <p className="text-surface-500 text-sm mt-1">Ekstrak palet dari gambar atau buat sendiri dengan kode hex.</p>
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
          <h2 className="font-semibold text-surface-900 mb-4">Palet Warna</h2>

          {palette.length === 0 && !imageUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <ImageIcon className="w-12 h-12 text-surface-300 mb-3" />
              <p className="text-surface-500 text-sm">Palet warna akan muncul di sini. Upload gambar untuk ekstraksi otomatis, atau tambah manual lewat input hex di bawah.</p>
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
              {/* Color Swatches */}
              <div className="flex rounded-xl overflow-hidden h-48 shadow-sm border border-surface-200">
                {palette.map((hex, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end pb-4 cursor-pointer hover:flex-[1.3] transition-all duration-200 group relative"
                    style={{ backgroundColor: hex }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 flex gap-1">
                      <span
                        className="bg-white/90 backdrop-blur text-surface-900 text-xs font-bold px-2 py-1 rounded shadow-sm cursor-pointer"
                        onClick={() => copyHex(hex)}
                      >
                        {copied === hex ? 'DISALIN!' : hex.toUpperCase()}
                      </span>
                      <button
                        onClick={() => removeHexColor(i)}
                        className="bg-white/80 backdrop-blur rounded-full p-1 shadow-sm hover:bg-white transition-colors"
                        title="Hapus warna"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Manual Hex Input */}
              <div className="mt-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">#</span>
                    <input
                      type="text"
                      className="input pl-7"
                      placeholder="FF5733"
                      value={hexInput}
                      onChange={e => setHexInput(e.target.value)}
                      onKeyDown={handleHexKeyDown}
                    />
                  </div>
                  <button onClick={addHexColor} className="btn-primary shrink-0" title="Tambah warna">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Color Chips */}
              {palette.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {palette.map((hex, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-surface-200 shadow-sm text-[11px] font-semibold cursor-pointer"
                      style={{ backgroundColor: hex, color: isLightColor(hex) ? '#1a1a2e' : '#ffffff' }}
                      onClick={() => copyHex(hex)}
                      title={`Klik untuk salin ${hex}`}
                    >
                      <span>{copied === hex ? '✓' : hex}</span>
                      <button
                        onClick={e => { e.stopPropagation(); removeHexColor(i); }}
                        className="hover:opacity-70 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Save Form */}
              <div className="mt-auto pt-4 border-t border-surface-200">
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

      {/* Color Picker */}
      <div className="card p-6">
        <h2 className="font-semibold text-surface-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary-500" /> Color Picker
        </h2>
        <div className="flex gap-6">
          {/* Preview */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div
              className="w-28 h-28 rounded-xl border-2 border-surface-200 shadow-sm transition-colors duration-100"
              style={{ backgroundColor: pickerHex }}
            />
            <div className="flex gap-1">
              <input
                type="text"
                className="input w-24 text-center text-xs font-mono font-bold"
                value={pickerHexInput || pickerHex}
                onChange={e => handlePickerHexChange(e.target.value)}
                onFocus={e => { setPickerHexInput(e.target.value || pickerHex); e.target.select(); }}
                onBlur={() => setPickerHexInput('')}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(pickerHex); setCopied(pickerHex); setTimeout(() => setCopied(null), 2000); }}
                className="btn-secondary p-2"
                title="Salin hex"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button onClick={addPickerColor} className="btn-primary w-full text-sm py-2">
              <Plus className="w-4 h-4" /> Tambah ke Palet
            </button>
            <button onClick={resetPicker} className="btn-secondary text-sm py-2 w-full">
              <RefreshCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          {/* Sliders */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="flex justify-between text-xs font-semibold text-surface-700 mb-1.5">
                <span>Hue</span><span className="text-surface-400">{pickerH}°</span>
              </label>
              <input
                type="range" min={0} max={360}
                value={pickerH}
                onChange={e => setPickerH(Number(e.target.value))}
                className="color-slider w-full"
                style={{
                  background: `linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))`,
                }}
              />
            </div>
            <div>
              <label className="flex justify-between text-xs font-semibold text-surface-700 mb-1.5">
                <span>Saturasi</span><span className="text-surface-400">{pickerS}%</span>
              </label>
              <input
                type="range" min={0} max={100}
                value={pickerS}
                onChange={e => setPickerS(Number(e.target.value))}
                className="color-slider w-full"
                style={{
                  background: `linear-gradient(to right, hsl(${pickerH},0%,${pickerL}%), hsl(${pickerH},100%,${pickerL}%))`,
                }}
              />
            </div>
            <div>
              <label className="flex justify-between text-xs font-semibold text-surface-700 mb-1.5">
                <span>Kecerahan</span><span className="text-surface-400">{pickerL}%</span>
              </label>
              <input
                type="range" min={0} max={100}
                value={pickerL}
                onChange={e => setPickerL(Number(e.target.value))}
                className="color-slider w-full"
                style={{
                  background: `linear-gradient(to right, hsl(${pickerH},${pickerS}%,0%), hsl(${pickerH},${pickerS}%,50%), hsl(${pickerH},${pickerS}%,100%))`,
                }}
              />
            </div>
          </div>
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
