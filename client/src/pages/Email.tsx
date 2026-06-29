import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Plus, Edit3, Trash2, Send, X, Copy } from 'lucide-react';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import api from '../lib/api';
import { showAlert } from '../lib/alert';

const CATEGORIES = ['order', 'followup', 'revision', 'confirmation', 'thank_you'] as const;
const CATEGORY_LABEL: Record<string, string> = { order: 'ORDER', followup: 'FOLLOW-UP', revision: 'REVISI', confirmation: 'KONFIRMASI', thank_you: 'TERIMA KASIH' };
const CATEGORY_COLOR: Record<string, string> = { order: 'text-blue-600', followup: 'text-amber-600', revision: 'text-red-600', confirmation: 'text-purple-600', thank_you: 'text-emerald-600' };

const templateSchema = z.object({
  name: z.string().min(1, 'Nama template wajib diisi'),
  subject: z.string().min(1, 'Subjek wajib diisi'),
  body: z.string().min(1, 'Isi email wajib diisi'),
  category: z.enum(CATEGORIES),
  isDefault: z.boolean().optional(),
  headerText: z.string().optional().nullable(),
  headerColor: z.string().optional().nullable(),
  headerAlign: z.string().optional().nullable(),
  bodyAlign: z.string().optional().nullable(),
  footerText: z.string().optional().nullable(),
  footerAlign: z.string().optional().nullable(),
});
type TemplateForm = z.infer<typeof templateSchema>;

interface Template { id: string; name: string; subject: string; body: string; category: string; isDefault: boolean; headerText?: string; headerColor?: string; headerAlign?: string; bodyAlign?: string; footerText?: string; footerAlign?: string; updatedAt: string; }

export default function Email() {
  const qc = useQueryClient();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/api/projects').then(r => r.data.projects || []),
  });

  const { data: templates = [], isLoading: loadTemplates } = useQuery<Template[]>({
    queryKey: ['email-templates'],
    queryFn: () => api.get('/api/email/templates').then(r => r.data),
  });

  const { register, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<TemplateForm>({ resolver: zodResolver(templateSchema) });

  const insertTag = (tag: string) => {
    const currentBody = getValues('body') || '';
    setValue('body', currentBody + (currentBody.endsWith(' ') ? '' : ' ') + `{{${tag}}}`, { shouldValidate: true, shouldDirty: true });
  };

  const saveMutation = useMutation({
    mutationFn: (data: TemplateForm) => editingId ? api.put(`/api/email/templates/${editingId}`, data) : api.post('/api/email/templates', data),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['email-templates'] }); setActiveTemplateId(res.data.id); closeForm(); },
  });

  const [sendForm, setSendForm] = useState({ projectId: '', recipientEmail: '', recipientName: '', subject: '', body: '', variables: '{}' });

  const sendEmailMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/email/send', data),
    onSuccess: () => {
      showAlert.success('Berhasil', 'Email berhasil dikirim!');
      setShowSendModal(false);
      qc.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onError: (err: any) => {
      showAlert.error('Gagal', 'Gagal mengirim email: ' + (err.response?.data?.error || err.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/email/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['email-templates'] }); setActiveTemplateId(null); },
  });

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setValue('name', t.name); setValue('subject', t.subject); setValue('body', t.body);
    setValue('category', t.category as any); setValue('isDefault', t.isDefault);
    setValue('headerText', t.headerText || '');
    setValue('headerColor', t.headerColor || '');
    setValue('headerAlign', t.headerAlign || 'center');
    setValue('bodyAlign', t.bodyAlign || 'left');
    setValue('footerText', t.footerText || '');
    setValue('footerAlign', t.footerAlign || 'center');
    setShowModal(true);
  };

  const closeForm = () => { setShowModal(false); setEditingId(null); reset(); };

  const openSendModal = () => {
    if (!activeTemplate) return;
    setSendForm({
      projectId: '',
      recipientEmail: '',
      recipientName: '',
      subject: activeTemplate.subject,
      body: activeTemplate.body,
      variables: '{}',
    });
    setShowSendModal(true);
  };

  useEffect(() => {
    if (!activeTemplateId && templates.length > 0 && !loadTemplates) {
      setActiveTemplateId(templates[0].id);
    }
  }, [activeTemplateId, templates, loadTemplates]);

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  useEffect(() => {
    if (showSendModal && activeTemplate) {
      setSendForm(prev => ({
        projectId: prev.projectId || '',
        recipientEmail: prev.recipientEmail || '',
        recipientName: prev.recipientName || '',
        subject: activeTemplate.subject,
        body: activeTemplate.body,
        variables: prev.variables || '{}',
      }));
    }
  }, [activeTemplate?.id, showSendModal]);

  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 overflow-hidden bg-white">
      {/* Left Pane - Master List */}
      <div className="w-80 flex-shrink-0 border-r border-surface-200 flex flex-col bg-surface-50">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-white">
          <h2 className="font-bold text-surface-900 text-sm">Template Email</h2>
          <button onClick={() => setShowModal(true)} className="btn-primary px-3 py-1.5 text-xs rounded-md shadow-sm"><Plus className="w-3 h-3" /> Baru</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadTemplates ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-center text-surface-500 text-sm">Belum ada template.</div>
          ) : (
            <div className="divide-y divide-surface-200">
              {templates.map(t => {
                const isActive = t.id === activeTemplateId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTemplateId(t.id)}
                    className={`w-full text-left p-4 transition-colors relative ${isActive ? 'bg-white' : 'hover:bg-surface-100/50'}`}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-600" />}
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm font-bold truncate pr-2 ${isActive ? 'text-surface-900' : 'text-surface-700'}`}>{t.name}</p>
                    </div>
                    <p className="text-xs text-surface-500 line-clamp-1 mb-2">{t.subject}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold tracking-wider ${CATEGORY_COLOR[t.category] || 'text-surface-500'} bg-surface-100 px-1.5 py-0.5 rounded`}>{CATEGORY_LABEL[t.category]}</span>
                      <span className="text-[10px] text-surface-400 font-mono">{format(new Date(t.updatedAt), 'd MMM yyyy', { locale: id })}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Detail View */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {activeTemplate ? (
          <>
            <div className="p-8 pb-6 border-b border-surface-200">
              <h1 className="text-2xl font-bold text-surface-900 mb-4">{activeTemplate.subject}</h1>
              <div className="text-sm text-surface-500 space-y-1">
                <p>Kepada: <span className="text-surface-700 font-medium">&lt;email.klien@domain.com&gt;</span> <span className="text-surface-400 italic">(Placeholder)</span></p>
                <p>Dari: <span className="text-surface-700 font-medium">DesignFlow App &lt;hello@designflow.app&gt;</span></p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl whitespace-pre-wrap font-sans text-surface-700 leading-relaxed text-[15px]">
                {activeTemplate.body}
              </div>
            </div>

            <div className="p-6 border-t border-surface-200 bg-surface-50 flex items-center gap-3">
              <button onClick={openSendModal} className="btn-primary shadow-sm"><Send className="w-4 h-4" /> Kirim Email</button>
              <button className="btn-secondary bg-white"><Copy className="w-4 h-4" /> Salin</button>
              <button onClick={() => openEdit(activeTemplate)} className="btn-secondary bg-white"><Edit3 className="w-4 h-4" /> Edit</button>
              <button onClick={() => { 
                Swal.fire({
                  title: 'Hapus Template?',
                  text: 'Template yang dihapus tidak dapat dikembalikan.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#ef4444',
                  cancelButtonColor: '#6b7280',
                  confirmButtonText: 'Ya, Hapus',
                  cancelButtonText: 'Batal',
                }).then((result) => { if (result.isConfirmed) deleteMutation.mutate(activeTemplate.id); });
              }} className="btn-secondary bg-white text-red-600 hover:text-red-700 hover:bg-red-50 border-transparent"><Trash2 className="w-4 h-4" /> Hapus</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-400">
            <Mail className="w-16 h-16 mb-4 text-surface-200" />
            <p>Pilih template dari daftar atau buat yang baru</p>
          </div>
        )}
      </div>

      {/* Send Email Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSendModal(false)}>
          <div className="card w-full max-w-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">Kirim Email</h2>
              <button onClick={() => setShowSendModal(false)} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Pilih Proyek (Opsional)</label>
                  <select 
                    className="select" 
                    value={sendForm.projectId} 
                    onChange={e => {
                      const p = projects.find((x: any) => x.id === e.target.value);
                      if (p && activeTemplate) {
                        const brief = (p.brief || {}) as Record<string, any>;
                        const specs = (brief.specs || {}) as Record<string, any>;
                        const vars: Record<string, string> = {
                          projectName: p.name || '',
                          clientName: p.client?.name || '',
                          projectType: brief.projectType || p.category || '',
                          description: brief.description || p.description || '',
                          deliverables: Array.isArray(brief.deliverables) ? brief.deliverables.join(', ') : (brief.deliverables || ''),
                          'specs.size': specs.size || '',
                          'specs.material': specs.material || '',
                          'specs.lamination': specs.lamination || '',
                          'specs.finishing': specs.finishing || '',
                        };
                        // Replace variables in subject and body for preview
                        let filledSubject = activeTemplate.subject;
                        let filledBody = activeTemplate.body;
                        Object.entries(vars).forEach(([key, val]) => {
                          const regex = new RegExp(`\\{\\{${key.replace('.', '\\.')}\\}\\}`, 'g');
                          const replacement = val ? val : '-';
                          filledSubject = filledSubject.replace(regex, replacement);
                          filledBody = filledBody.replace(regex, replacement);
                        });
                        setSendForm({
                          ...sendForm,
                          projectId: e.target.value,
                          recipientEmail: p.client?.email || sendForm.recipientEmail,
                          recipientName: p.client?.name || sendForm.recipientName,
                          subject: filledSubject,
                          body: filledBody,
                          variables: JSON.stringify(vars),
                        });
                      } else {
                        setSendForm({
                          ...sendForm,
                          projectId: e.target.value,
                          subject: activeTemplate?.subject || sendForm.subject,
                          body: activeTemplate?.body || sendForm.body,
                          variables: '{}',
                        });
                      }
                    }}
                  >
                    <option value="">-- Pilih Proyek --</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name} {p.client?.name ? `(${p.client.name})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Email Penerima *</label>
                  <input type="email" className="input" value={sendForm.recipientEmail} onChange={e => setSendForm({...sendForm, recipientEmail: e.target.value})} required />
                </div>
              </div>
              
              <div>
                <label className="label">Subjek</label>
                <input type="text" className="input" value={sendForm.subject} onChange={e => setSendForm({...sendForm, subject: e.target.value})} required />
              </div>
              
              <div>
                <label className="label">Isi Pesan</label>
                <textarea className="textarea font-sans" rows={8} value={sendForm.body} onChange={e => setSendForm({...sendForm, body: e.target.value})} required />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
                <button onClick={() => setShowSendModal(false)} className="btn-ghost">Batal</button>
                <button 
                  onClick={() => sendEmailMutation.mutate({ templateId: activeTemplateId, ...sendForm })} 
                  className="btn-primary"
                  disabled={!sendForm.recipientEmail || !sendForm.subject || !sendForm.body || sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? 'Mengirim...' : 'Kirim Sekarang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeForm}>
          <div className="card w-full max-w-2xl p-6 animate-slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">{editingId ? 'Edit Template' : 'Buat Template Baru'}</h2>
              <button onClick={closeForm} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 h-[60vh] overflow-y-auto p-1">
                <div><label className="label">Nama Template</label><input className="input" placeholder="Misal: Order Cetak Poster" {...register('name')} />{errors.name && <p className="form-error">{errors.name.message}</p>}</div>
                <div><label className="label">Kategori</label>
                  <select className="select" {...register('category')}>
                    {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className="label">Subjek Email</label><input className="input" placeholder="Order Cetak — {{projectName}}" {...register('subject')} />{errors.subject && <p className="form-error">{errors.subject.message}</p>}</div>
                <div className="col-span-2">
                  <div className="flex justify-between items-end mb-1.5">
                    <label className="label mb-0">Isi Email</label>
                    <span className="text-xs text-surface-500">Klik tag untuk menambahkan ke pesan</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['projectName', 'clientName', 'projectType', 'description', 'deliverables', 'specs.size', 'specs.material', 'specs.lamination', 'specs.finishing'].map(t => (
                      <button key={t} type="button" onClick={() => insertTag(t)} className="text-[10px] bg-primary-50 hover:bg-primary-100 text-primary-700 px-2 py-1 rounded font-mono transition-colors border border-primary-100">
                        +{t}
                      </button>
                    ))}
                  </div>
                  <textarea className="textarea font-mono text-sm h-48" placeholder="Yth. Bapak/Ibu,\n\nSaya ingin melakukan pemesanan cetak..." {...register('body')} />
                  {errors.body && <p className="form-error">{errors.body.message}</p>}
                </div>
                
                <div className="col-span-2 mt-2 pt-4 border-t border-surface-200">
                  <h3 className="font-semibold text-surface-900 mb-3 text-sm flex items-center gap-2"><Edit3 className="w-4 h-4 text-primary-500"/> Kustomisasi Tampilan (Opsional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">Teks Header</label><input className="input" placeholder="Default: DesignFlow" {...register('headerText')} /></div>
                    <div><label className="label">Warna Header (Hex/Gradient)</label><input className="input" placeholder="#2563eb atau linear-gradient(...)" {...register('headerColor')} /></div>
                    <div><label className="label">Posisi Header</label>
                      <select className="select" {...register('headerAlign')}>
                        <option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option>
                      </select>
                    </div>
                    <div><label className="label">Posisi Body Email</label>
                      <select className="select" {...register('bodyAlign')}>
                        <option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option>
                      </select>
                    </div>
                    <div><label className="label">Teks Footer</label><input className="input" placeholder="Default: Email ini dikirim otomatis..." {...register('footerText')} /></div>
                    <div><label className="label">Posisi Footer</label>
                      <select className="select" {...register('footerAlign')}>
                        <option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
              <div className="flex gap-3 pt-4 border-t border-surface-200">
                <button type="button" onClick={closeForm} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center">{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
