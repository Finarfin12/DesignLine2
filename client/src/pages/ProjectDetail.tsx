import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Trash2, Mail, Save, Edit3, X, Plus, Printer, Play, Pause, Receipt, History, Link as LinkIcon, CheckSquare } from 'lucide-react';
import { showAlert } from '../lib/alert';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import api, { getFileUrl } from '../lib/api';



const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active', completed: 'badge-completed',
  on_hold: 'badge-on_hold', cancelled: 'badge-cancelled',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif', completed: 'Selesai', on_hold: 'Ditunda', cancelled: 'Dibatalkan',
};

const projectSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['Logo', 'Brochure', 'Poster', 'Packaging', 'Digital', 'UI/UX', 'Other']),
  status: z.enum(['draft', 'active', 'on_hold', 'completed']),
  deadline: z.string().optional(),
  notes: z.string().optional(),
});

const briefSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  description: z.string().optional(),
  clientName: z.string().optional(),
  projectType: z.string().optional(),
  deliverables: z.string().optional(), // comma separated
  specs: z.object({
    size: z.string().optional(),
    resolution: z.string().optional(),
    colorMode: z.string().optional(),
    format: z.string().optional(),
    bleed: z.string().optional(),
    material: z.string().optional(),
    lamination: z.string().optional(),
    finishing: z.string().optional(),
    platform: z.string().optional(),
    pagesCount: z.string().optional(),
    software: z.string().optional(),
  }).optional(),
  references: z.string().optional(), // comma separated URLs
});

type ProjectForm = z.infer<typeof projectSchema>;
type BriefForm = z.infer<typeof briefSchema>;

const CATEGORY_SPECS: Record<string, {
  fields: { name: string, label: string, placeholder: string }[],
  defaults: Record<string, string>
}> = {
  'Logo': {
    fields: [
      { name: 'colorMode', label: 'Color Mode', placeholder: 'CMYK / RGB' },
      { name: 'format', label: 'Format File', placeholder: 'AI, EPS, SVG, PNG, JPG' },
      { name: 'guidelines', label: 'Brand Guidelines', placeholder: 'Strict / Flexible' },
    ],
    defaults: { colorMode: 'CMYK & RGB', format: 'AI, EPS, SVG, PNG, JPG' }
  },
  'Brochure': {
    fields: [
      { name: 'size', label: 'Ukuran', placeholder: 'A4, A5, dll' },
      { name: 'pagesCount', label: 'Jumlah Halaman', placeholder: '4 Halaman' },
      { name: 'resolution', label: 'Resolusi', placeholder: '300 DPI' },
      { name: 'colorMode', label: 'Color Mode', placeholder: 'CMYK' },
      { name: 'bleed', label: 'Bleed', placeholder: '3mm' },
      { name: 'material', label: 'Bahan', placeholder: 'Art Paper 150gsm / Flexy' },
      { name: 'finishing', label: 'Lipatan / Finishing', placeholder: 'Bi-fold' },
    ],
    defaults: { size: 'A4', pagesCount: '4 Halaman', resolution: '300 DPI', colorMode: 'CMYK', bleed: '3mm', material: 'Art Paper 150gsm', finishing: 'Bi-fold' }
  },
  'Poster': {
    fields: [
      { name: 'size', label: 'Ukuran', placeholder: 'A3, A2' },
      { name: 'resolution', label: 'Resolusi', placeholder: '300 DPI' },
      { name: 'colorMode', label: 'Color Mode', placeholder: 'CMYK' },
      { name: 'bleed', label: 'Bleed', placeholder: '3mm' },
      { name: 'material', label: 'Bahan', placeholder: 'Art Carton 260gsm / Flexy 280gr' },
    ],
    defaults: { size: 'A3', resolution: '300 DPI', colorMode: 'CMYK', bleed: '3mm', material: 'Art Carton 260gsm' }
  },
  'Packaging': {
    fields: [
      { name: 'size', label: 'Ukuran (P x L x T)', placeholder: '10x10x15 cm' },
      { name: 'dieline', label: 'Dieline / Pola', placeholder: 'Ya / Tidak' },
      { name: 'resolution', label: 'Resolusi', placeholder: '300 DPI' },
      { name: 'colorMode', label: 'Color Mode', placeholder: 'CMYK' },
      { name: 'bleed', label: 'Bleed', placeholder: '5mm' },
      { name: 'material', label: 'Bahan', placeholder: 'Ivory / Duplex' },
      { name: 'finishing', label: 'Finishing', placeholder: 'Laminasi Doff, Spot UV' },
    ],
    defaults: { dieline: 'Ya', resolution: '300 DPI', colorMode: 'CMYK', bleed: '5mm', material: 'Ivory / Duplex', finishing: 'Die Cut' }
  },
  'UI/UX': {
    fields: [
      { name: 'platform', label: 'Target Platform', placeholder: 'Web, iOS, Android' },
      { name: 'pagesCount', label: 'Jumlah Halaman / Screen', placeholder: '5 Screens' },
      { name: 'software', label: 'Software / Tools', placeholder: 'Figma, Framer' },
      { name: 'resolution', label: 'Resolusi Layar', placeholder: 'Responsive / 1440px' },
    ],
    defaults: { platform: 'Web & Mobile', pagesCount: '5 Screens', software: 'Figma', resolution: 'Responsive' }
  },
  'Digital': {
    fields: [
      { name: 'platform', label: 'Target Platform', placeholder: 'Social Media, Web Banner' },
      { name: 'resolution', label: 'Resolusi / Ukuran', placeholder: '1080x1080px (72 DPI)' },
      { name: 'colorMode', label: 'Color Mode', placeholder: 'RGB' },
      { name: 'format', label: 'Format File', placeholder: 'JPG, PNG, MP4' },
      { name: 'software', label: 'Software / Tools', placeholder: 'Photoshop, After Effects' },
    ],
    defaults: { platform: 'Social Media', resolution: '1080x1080px (72 DPI)', colorMode: 'RGB', format: 'JPG/PNG' }
  },
  'Other': {
    fields: [
      { name: 'size', label: 'Ukuran', placeholder: 'Cth: A4, 30x40cm' },
      { name: 'resolution', label: 'Resolusi', placeholder: 'Cth: 300 DPI' },
      { name: 'colorMode', label: 'Color Mode', placeholder: 'Cth: CMYK, RGB' },
      { name: 'material', label: 'Bahan', placeholder: 'Cth: Art Paper 150gsm' },
      { name: 'format', label: 'Format File', placeholder: 'Cth: JPG, PDF, EPS' },
      { name: 'finishing', label: 'Notes / Finishing', placeholder: 'Cth: Laminasi Doff, Spot UV' },
    ],
    defaults: {}
  }
};

export default function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editProject, setEditProject] = useState(false);
  const [editBrief, setEditBrief] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '', templateId: '' });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const [printMode, setPrintMode] = useState<'spk' | 'invoice'>('spk');
  
  // Invoice State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState([{ description: '', qty: 1, price: 0 }]);
  const [invoiceTax, setInvoiceTax] = useState(0);
  const [invoiceDiscount, setInvoiceDiscount] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Asset/Revision State
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetMode, setAssetMode] = useState<'upload' | 'link'>('upload');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetForm, setAssetForm] = useState({ name: '', fileUrl: '', version: 1, revisionNotes: '', type: 'image' });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/api/projects/${projectId}`).then(r => r.data),
  });

  const { data: invoice } = useQuery({
    queryKey: ['invoice', projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/invoice`, { headers: { 'x-silent-error': 'true' } }).then(r => r.data).catch(() => null),
  });

  useEffect(() => {
    if (invoice && !showInvoiceModal) {
      setInvoiceItems(invoice.items?.length ? invoice.items : [{ description: '', qty: 1, price: 0 }]);
      setInvoiceTax(invoice.tax || 0);
      setInvoiceDiscount(invoice.discount || 0);
      setInvoiceNotes(invoice.notes || '');
    }
  }, [invoice, showInvoiceModal]);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    if (project?.timeSpent !== undefined) {
      setTimeSpent(project.timeSpent);
    }
  }, [project?.timeSpent]);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => setTimeSpent(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const toggleTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      api.put(`/api/projects/${projectId}`, { timeSpent });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    } else {
      setIsTimerRunning(true);
    }
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => api.get('/api/email/templates').then(r => r.data),
  });

  const { register: rp, handleSubmit: hp, reset: resetProject } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    values: project ? {
      name: project.name, category: project.category,
      status: project.status, deadline: project.deadline?.split('T')[0] ?? '',
      notes: project.notes ?? '',
    } : undefined,
  });

  const { register: rb, handleSubmit: hb, reset: resetBrief, setValue: setBriefValue, getValues: getBriefValues } = useForm<BriefForm>({
    resolver: zodResolver(briefSchema),
    values: project?.brief ? {
      title: project.brief.title,
      description: project.brief.description ?? '',
      clientName: project.brief.clientName ?? '',
      projectType: project.brief.projectType ?? '',
      deliverables: (project.brief.deliverables as string[] | null)?.join(', ') ?? '',
      specs: project.brief.specs ?? {},
      references: (project.brief.references as string[] | null)?.join(', ') ?? '',
    } : undefined,
  });



  const [isUploadingBrief, setIsUploadingBrief] = useState(false);
  const handleBriefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploadingBrief(true);
    try {
      const newUrls = [];
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        formData.append('type', 'image');
        if (projectId) formData.append('projectId', projectId);
        const res = await api.post('/api/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const fileUrl = getFileUrl(res.data.fileUrl);
        newUrls.push(fileUrl);
      }
      const currentRefs = getBriefValues('references') || '';
      const combined = currentRefs ? `${currentRefs}, ${newUrls.join(', ')}` : newUrls.join(', ');
      setBriefValue('references', combined);
    } catch (err) {
      console.error(err);
      showAlert.error('Gagal', 'Gagal mengupload referensi');
    }
    setIsUploadingBrief(false);
  };

  const updateProject = useMutation({
    mutationFn: (data: ProjectForm) => {
      const payload: any = { ...data };
      if (payload.deadline) {
        payload.deadline = new Date(payload.deadline).toISOString();
      } else {
        delete payload.deadline;
      }
      return api.put(`/api/projects/${projectId}`, payload);
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['project', projectId] }); 
      qc.invalidateQueries({ queryKey: ['projects'] }); 
      setEditProject(false); 
    },
    onError: (err: any) => {
      showAlert.error('Gagal', 'Gagal menyimpan proyek: ' + (err.response?.data?.error || err.message));
    }
  });

  const saveBrief = useMutation({
    mutationFn: (data: BriefForm) => {
      const payload = {
        ...data,
        deliverables: data.deliverables?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        references: data.references?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
      };
      return project?.brief
        ? api.put(`/api/projects/${projectId}/brief`, payload)
        : api.post(`/api/projects/${projectId}/brief`, payload);
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['project', projectId] }); 
      qc.invalidateQueries({ queryKey: ['projects'] }); 
      setEditBrief(false); 
    },
  });

  const deleteProject = useMutation({
    mutationFn: () => api.delete(`/api/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
    onError: (err: any) => {
      showAlert.error('Gagal', 'Gagal menghapus proyek: ' + (err.response?.data?.error || err.message));
      setDeleteConfirm(false);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: () => api.post('/api/email/send', {
      templateId: emailForm.templateId,
      projectId: projectId,
      recipientEmail: emailForm.to,
      subject: emailForm.subject,
      body: emailForm.body,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setShowEmailModal(false);
      showAlert.success('Berhasil', 'Email berhasil dikirim!');
    },
    onError: (err: any) => {
      showAlert.error('Gagal', 'Gagal mengirim email: ' + (err.response?.data?.error || err.message));
    }
  });

  const addTask = useMutation({
    mutationFn: () => api.post(`/api/projects/${projectId}/tasks`, { title: newTaskTitle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setNewTaskTitle('');
    }
  });

  const toggleTask = useMutation({
    mutationFn: (task: any) => api.put(`/api/projects/${projectId}/tasks/${task.id}`, { isCompleted: !task.isCompleted }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] })
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => api.delete(`/api/projects/${projectId}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] })
  });

  const saveInvoice = useMutation({
    mutationFn: () => {
      const payload = { items: invoiceItems, tax: invoiceTax, discount: invoiceDiscount, notes: invoiceNotes };
      return invoice 
        ? api.put(`/api/projects/${projectId}/invoice`, payload)
        : api.post(`/api/projects/${projectId}/invoice`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', projectId] });
      setShowInvoiceModal(false);
    }
  });

  const addAssetLink = useMutation({
    mutationFn: async () => {
      if (assetMode === 'link') {
        return api.post('/api/assets/link', { ...assetForm, projectId });
      } else {
        if (!assetFile) throw new Error("No file selected");
        const formData = new FormData();
        formData.append('file', assetFile);
        formData.append('name', assetForm.name);
        formData.append('type', assetForm.type);
        formData.append('version', String(assetForm.version));
        if (assetForm.revisionNotes) formData.append('revisionNotes', assetForm.revisionNotes);
        if (projectId) formData.append('projectId', projectId);
        return api.post('/api/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setShowAssetModal(false);
      setAssetForm({ name: '', fileUrl: '', version: 1, revisionNotes: '', type: 'image' });
      setAssetFile(null);
    }
  });

  const handleApplyTemplate = (tId: string) => {
    const t = templates.find((x: any) => x.id === tId);
    if (!t) return setEmailForm(prev => ({ ...prev, templateId: tId }));
    
    const vars: Record<string, string> = {
      projectName: project?.name || '',
      clientName: project?.brief?.clientName || project?.client?.name || '',
      projectType: project?.brief?.projectType || project?.category || '',
      description: project?.brief?.description || '',
      deliverables: project?.brief?.deliverables?.join(', ') || '',
      'specs.size': (project?.brief?.specs as any)?.size || '',
      'specs.material': (project?.brief?.specs as any)?.material || '',
      'specs.lamination': (project?.brief?.specs as any)?.lamination || '',
      'specs.finishing': (project?.brief?.specs as any)?.finishing || '',
    };
    
    let subject = t.subject;
    let body = t.body;
    
    Object.entries(vars).forEach(([k, v]) => {
      const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
      subject = subject.replace(regex, String(v));
      body = body.replace(regex, String(v));
    });
    
    setEmailForm(prev => ({ ...prev, templateId: tId, subject, body }));
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!project) return <div className="text-center py-20 text-surface-400">Proyek tidak ditemukan</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 no-print">
        <Link to="/projects" className="btn-ghost btn-icon"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">{project.name}</h1>
            <span className={`${STATUS_BADGE[project.status]} badge`}>{STATUS_LABEL[project.status]}</span>
          </div>
          <p className="page-subtitle">{project.category}{project.client ? ` · ${project.client.name}` : ''}{project.deadline ? ` · Deadline: ${format(new Date(project.deadline), 'd MMM yyyy', { locale: id })}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center bg-surface-50 border border-surface-200 rounded-lg overflow-hidden mr-2 no-print">
            <div className="px-3 py-2 text-sm font-mono font-medium text-surface-700 bg-white border-r border-surface-200 w-24 text-center">
              {formatTimer(timeSpent)}
            </div>
            <button 
              onClick={toggleTimer} 
              className={`px-3 py-2 transition-colors flex items-center justify-center ${isTimerRunning ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'text-primary-600 hover:bg-primary-50'}`}
              title={isTimerRunning ? 'Pause Timer' : 'Start Timer'}
            >
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => { setPrintMode('spk'); setTimeout(() => window.print(), 100); }} className="btn-secondary"><Printer className="w-4 h-4" />Cetak SPK</button>
          <button onClick={() => setShowInvoiceModal(true)} className="btn-secondary"><Receipt className="w-4 h-4" />Invoice</button>
          <button onClick={() => setEditProject(!editProject)} className="btn-secondary"><Edit3 className="w-4 h-4" />Edit</button>
          <button onClick={() => setDeleteConfirm(true)} className="btn-danger"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      
      {/* Print-only Header (replaces the interactive one above during print) */}
      <div className={`print-only ${printMode !== 'spk' ? '!hidden' : ''} mb-8 pb-4 border-b border-surface-200`}>
        <h1 className="text-3xl font-bold text-surface-900 mb-2">{project.name}</h1>
        <p className="text-surface-600">Surat Perintah Kerja (SPK) · {project.category}{project.client ? ` · ${project.client.name}` : ''}</p>
      </div>

      <div className={`print-only ${printMode !== 'invoice' ? '!hidden' : ''} mb-8 pb-4`}>
        <div className="flex justify-between items-end border-b border-surface-200 pb-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold text-surface-900 mb-1">INVOICE</h1>
            <p className="text-surface-500">#{invoice?.id?.slice(-6).toUpperCase() || 'DRAFT'}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-surface-900">{project.client?.company || project.client?.name}</p>
            <p className="text-sm text-surface-600">{project.client?.email || ''}</p>
          </div>
        </div>
        <table className="w-full text-left mb-6">
          <thead>
            <tr className="border-b border-surface-200 text-surface-500 text-sm">
              <th className="py-2">Deskripsi</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Harga</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice?.items || []).map((item: any, i: number) => (
              <tr key={i} className="border-b border-surface-100">
                <td className="py-3 text-surface-900">{item.description}</td>
                <td className="py-3 text-right text-surface-600">{item.qty}</td>
                <td className="py-3 text-right text-surface-600">Rp {item.price.toLocaleString('id-ID')}</td>
                <td className="py-3 text-right font-medium text-surface-900">Rp {(item.qty * item.price).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end text-sm">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-surface-600"><span>Subtotal</span><span>Rp {(invoice?.items || []).reduce((sum: number, i: any) => sum + (i.qty * i.price), 0).toLocaleString('id-ID')}</span></div>
            {invoice?.tax > 0 && <div className="flex justify-between text-surface-600"><span>Pajak</span><span>Rp {invoice.tax.toLocaleString('id-ID')}</span></div>}
            {invoice?.discount > 0 && <div className="flex justify-between text-surface-600"><span>Diskon</span><span>- Rp {invoice.discount.toLocaleString('id-ID')}</span></div>}
            <div className="flex justify-between text-lg font-bold text-surface-900 pt-2 border-t border-surface-200">
              <span>TOTAL</span>
              <span>Rp {((invoice?.items || []).reduce((sum: number, i: any) => sum + (i.qty * i.price), 0) + (invoice?.tax || 0) - (invoice?.discount || 0)).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
        {invoice?.notes && <div className="mt-8 pt-4 border-t border-surface-200 text-sm text-surface-500"><p className="font-semibold text-surface-700">Catatan:</p><p>{invoice.notes}</p></div>}
      </div>

      {/* Edit Project */}
      {editProject && (
        <div className="card p-6 animate-slide-up shadow-sm">
          <h2 className="font-semibold text-surface-900 mb-4">Edit Proyek</h2>
          <form onSubmit={hp(d => updateProject.mutate(d))} className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Nama Proyek</label><input className="input" {...rp('name')} /></div>
            <div><label className="label">Kategori</label>
              <select className="select" {...rp('category')}>
                {['Logo','Brochure','Poster','Packaging','Digital','UI/UX','Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="select" {...rp('status')}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><label className="label">Deadline</label><input type="date" className="input" {...rp('deadline')} /></div>
            <div className="col-span-2"><label className="label">Catatan</label><textarea className="textarea" rows={3} {...rp('notes')} /></div>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => { setEditProject(false); resetProject(); }} className="btn-secondary">Batal</button>
              <button type="submit" disabled={updateProject.isPending} className="btn-primary"><Save className="w-4 h-4" />{updateProject.isPending ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Brief Section */}
      <div className="card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50/50">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-primary-500 no-print" />
            <h2 className="font-semibold text-surface-900 text-lg">Project Brief</h2>
          </div>
          <button onClick={() => {
            if (!editBrief && !project.brief && project.category) {
              const catSpec = CATEGORY_SPECS[project.category] || CATEGORY_SPECS['Other'];
              resetBrief({
                title: `Brief ${project.name}`,
                description: '',
                clientName: project.client?.name || '',
                projectType: project.category,
                deliverables: '',
                specs: catSpec.defaults,
                references: ''
              });
            } else if (!editBrief && project.brief) {
              resetBrief({
                title: project.brief.title,
                description: project.brief.description ?? '',
                clientName: project.brief.clientName ?? '',
                projectType: project.brief.projectType ?? '',
                deliverables: (project.brief.deliverables as string[] | null)?.join(', ') ?? '',
                specs: project.brief.specs ?? {},
                references: (project.brief.references as string[] | null)?.join(', ') ?? '',
              });
            }
            setEditBrief(!editBrief);
          }} className="btn-secondary btn-sm bg-white no-print">
            {editBrief ? <X className="w-3 h-3" /> : <><Edit3 className="w-3 h-3" />{project.brief ? 'Edit' : 'Buat Brief'}</>}
          </button>
        </div>

        {editBrief ? (
          <form onSubmit={hb(d => saveBrief.mutate(d))} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="label">Judul Brief *</label><input className="input" placeholder="Brief Logo Brand ABC" {...rb('title')} /></div>
              <div className="col-span-2"><label className="label">Deskripsi Proyek</label><textarea className="textarea" rows={3} placeholder="Deskripsi singkat proyek..." {...rb('description')} /></div>
              <div><label className="label">Nama Klien</label><input className="input" {...rb('clientName')} /></div>
              <div><label className="label">Tipe Proyek</label><input className="input" placeholder="Logo Design" {...rb('projectType')} /></div>
              <div className="col-span-2"><label className="label">Deliverables (pisah dengan koma)</label><input className="input" placeholder="Logo PNG, Logo SVG, Brand Guidelines" {...rb('deliverables')} /></div>
            </div>

            <div className="divider" />
            <h3 className="text-sm font-semibold text-surface-700">Spesifikasi Teknis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(CATEGORY_SPECS[project.category] || CATEGORY_SPECS['Other']).fields.map(field => (
                <div key={field.name}>
                  <label className="label">{field.label}</label>
                  <input className="input" placeholder={field.placeholder} {...rb(`specs.${field.name}` as keyof BriefForm)} />
                </div>
              ))}
            </div>

            <div>
              <label className="label">Referensi & Moodboard (URL Gambar, #Hex Warna, atau Catatan Teks, pisahkan dengan koma)</label>
              <textarea className="textarea mb-2" rows={3} placeholder="https://unsplash.com/..., #FF5500, #1E1E1E, Gunakan Font Montserrat..." {...rb('references')} />
              <label className="btn-secondary btn-sm inline-flex cursor-pointer">
                {isUploadingBrief ? 'Mengupload...' : 'Atau Upload Gambar Referensi'}
                <input type="file" multiple className="hidden" accept="image/*" onChange={handleBriefUpload} disabled={isUploadingBrief} />
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setEditBrief(false); resetBrief(); }} className="btn-secondary">Batal</button>
              <button type="submit" disabled={saveBrief.isPending} className="btn-primary"><Save className="w-4 h-4" />{saveBrief.isPending ? 'Menyimpan...' : 'Simpan Brief'}</button>
            </div>
          </form>
        ) : project.brief ? (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500 font-medium">Judul</span><p className="text-surface-900 font-medium mt-0.5">{project.brief.title}</p></div>
              {project.brief.clientName && <div><span className="text-surface-500 font-medium">Klien</span><p className="text-surface-900 mt-0.5">{project.brief.clientName}</p></div>}
              {project.brief.projectType && <div><span className="text-surface-500 font-medium">Tipe</span><p className="text-surface-900 mt-0.5">{project.brief.projectType}</p></div>}
              {project.brief.description && <div className="col-span-2"><span className="text-surface-500 font-medium">Deskripsi</span><p className="text-surface-800 mt-0.5">{project.brief.description}</p></div>}
            </div>
            {project.brief.deliverables?.length > 0 && (
              <div><p className="text-surface-500 text-sm mb-1.5">Deliverables</p>
                <div className="flex flex-wrap gap-2">{(project.brief.deliverables as string[]).map((d: string, i: number) => <span key={i} className="badge badge-default">{d}</span>)}</div>
              </div>
            )}
            {project.brief.specs && Object.values(project.brief.specs).some(Boolean) && (
              <div>
                <p className="text-surface-700 font-medium text-sm mb-2">Spesifikasi Teknis</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(project.brief.specs as Record<string, string>).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
                      <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">{k}</p>
                      <p className="text-sm text-surface-900 font-medium mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {project.brief.references?.length > 0 && (
              <div className="pt-2 border-t border-surface-100">
                <p className="text-surface-700 font-medium text-sm mb-3">Referensi & Moodboard</p>
                <div className="flex flex-wrap gap-4 items-end">
                  {(project.brief.references as string[]).map((url: string, i: number) => {
                    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) || url.includes('unsplash.com/photo');
                    const isColor = /^#([0-9A-F]{3}){1,2}$/i.test(url.trim());
                    
                    if (isColor) {
                      return (
                        <div key={i} className="w-16 h-16 rounded-full border border-surface-200 shadow-sm flex items-center justify-center text-[10px] font-bold text-white shadow-inner group" style={{ backgroundColor: url.trim() }}>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded px-1">{url.trim()}</span>
                        </div>
                      );
                    }
                    
                    if (!url.startsWith('http')) {
                      return (
                        <div key={i} className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-700/50 rounded-lg text-sm max-w-[250px] shadow-sm font-medium">
                          {url.trim()}
                        </div>
                      );
                    }

                    try {
                      return isImage ? (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-40 h-40 rounded-xl overflow-hidden border border-surface-200 hover:border-primary-500 transition-all shadow-sm hover:-translate-y-1 hover:shadow-md">
                          <img src={url} alt="Reference" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-surface-50 border border-surface-200 hover:border-primary-500 text-primary-600 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                          🔗 {new URL(url).hostname.replace('www.', '')}
                        </a>
                      );
                    } catch {
                      return <span key={i} className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border border-yellow-200 dark:border-yellow-700/50 rounded-lg text-sm max-w-[250px] shadow-sm font-medium">{url.trim()}</span>;
                    }
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-surface-600" />
            <p className="text-surface-400 text-sm">Belum ada brief untuk proyek ini</p>
            <button onClick={() => setEditBrief(true)} className="btn-primary btn-sm mt-3 inline-flex"><Plus className="w-3 h-3" />Buat Brief</button>
          </div>
        )}
      </div>

      {/* Pre-flight Checklist (Only for Print categories) */}
      {['Brochure', 'Poster', 'Packaging', 'Other'].includes(project.category) && (
        <div className="card no-print border-amber-200 bg-amber-50/30 dark:bg-amber-900/10 dark:border-amber-700/50">
          <div className="px-6 py-4 border-b border-amber-200 dark:border-amber-700/50 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-500" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Pre-flight Print Checklist (Manual)</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2 text-surface-700 dark:text-surface-300 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100"><input type="checkbox" className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" /> Color Mode CMYK</label>
              <label className="flex items-center gap-2 text-surface-700 dark:text-surface-300 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100"><input type="checkbox" className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" /> Resolusi Minimum 300 DPI</label>
              <label className="flex items-center gap-2 text-surface-700 dark:text-surface-300 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100"><input type="checkbox" className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" /> Bleed Area (Min. 3mm)</label>
              <label className="flex items-center gap-2 text-surface-700 dark:text-surface-300 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100"><input type="checkbox" className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" /> Fonts Outlined / Converted to Curves</label>
              <label className="flex items-center gap-2 text-surface-700 dark:text-surface-300 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100"><input type="checkbox" className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" /> Images Embedded</label>
              <label className="flex items-center gap-2 text-surface-700 dark:text-surface-300 cursor-pointer hover:text-surface-900 dark:hover:text-surface-100"><input type="checkbox" className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" /> Export format PDF/X-1a (Siap Cetak)</label>
            </div>
          </div>
        </div>
      )}

      {/* Mini To-Do List */}
      <div className="card no-print">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50/50">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-4 h-4 text-primary-500" />
            <h2 className="font-semibold text-surface-900 text-lg">To-Do List</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-3 mb-4">
            {project.tasks?.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-surface-50 border border-surface-200 rounded-lg hover:border-primary-200 transition-colors">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={task.isCompleted} onChange={() => toggleTask.mutate(task)} className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500 cursor-pointer" />
                  <span className={`text-sm font-medium ${task.isCompleted ? 'line-through text-surface-400' : 'text-surface-900'}`}>{task.title}</span>
                </div>
                <button onClick={() => deleteTask.mutate(task.id)} className="text-surface-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {project.tasks?.length === 0 && <p className="text-sm text-surface-500 text-center py-4">Belum ada tugas. Pecah proyek ini jadi langkah kecil!</p>}
          </div>
          <form onSubmit={e => { e.preventDefault(); if (newTaskTitle.trim()) addTask.mutate(); }} className="flex gap-2">
            <input className="input flex-1" placeholder="Tambah tugas baru (Misal: Wireframe Homepage)..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} disabled={addTask.isPending} />
            <button type="submit" disabled={!newTaskTitle.trim() || addTask.isPending} className="btn-primary"><Plus className="w-4 h-4" /> Tambah</button>
          </form>
        </div>
      </div>

      {/* Assets & Revisions Section */}
      <div className="card no-print">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-surface-50/50">
          <div className="flex items-center gap-3">
            <History className="w-4 h-4 text-primary-500" />
            <h2 className="font-semibold text-surface-900 text-lg">Aset & Revisi Desain</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAssetModal(true)} className="btn-secondary btn-sm bg-white"><Plus className="w-3 h-3" />Tambah Aset / Revisi</button>
          </div>
        </div>
        <div className="p-6">
          {project.assets?.length > 0 ? (
            <div className="relative border-l-2 border-surface-200 ml-3 pl-6 space-y-6">
              {project.assets.sort((a: any, b: any) => b.version - a.version).map((asset: any) => (
                <div key={asset.id} className="relative">
                  <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-primary-500 border-4 border-white shadow-sm" />
                  <div className="bg-surface-50 border border-surface-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="badge badge-active mb-1">Versi {asset.version}</span>
                        <h3 className="font-bold text-surface-900">{asset.name}</h3>
                      </div>
                      <span className="text-xs font-mono text-surface-500">{format(new Date(asset.createdAt), 'd MMM HH:mm', { locale: id })}</span>
                    </div>
                    {asset.revisionNotes && <p className="text-sm text-surface-700 bg-white border border-surface-200 rounded-lg p-3 mb-3 font-medium">💬 "{asset.revisionNotes}"</p>}
                    <a href={getFileUrl(asset.fileUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                      <LinkIcon className="w-3 h-3" /> Buka Tautan Aset
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-surface-400 text-sm">Belum ada riwayat revisi atau aset yang ditautkan.</div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 animate-slide-up shadow-xl">
            <h2 className="text-lg font-bold text-surface-900 mb-2">Hapus Proyek?</h2>
            <p className="text-sm text-surface-600 mb-5">Tindakan ini tidak bisa dibatalkan. Brief dan semua data proyek akan ikut terhapus.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => deleteProject.mutate()} disabled={deleteProject.isPending} className="btn-danger flex-1 justify-center">
                {deleteProject.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl p-6 animate-slide-up shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">Kirim Email via Project</h2>
              <button onClick={() => setShowEmailModal(false)} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Pilih Template</label>
                  <select 
                    className="select" 
                    value={emailForm.templateId} 
                    onChange={e => handleApplyTemplate(e.target.value)}
                  >
                    <option value="">-- Pilih Template --</option>
                    {templates.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Kirim Kepada (Email Klien/Percetakan) *</label>
                  <input 
                    className="input" 
                    placeholder="email@domain.com" 
                    value={emailForm.to} 
                    onChange={e => setEmailForm(p => ({ ...p, to: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Subjek Email</label>
                <input 
                  className="input" 
                  value={emailForm.subject} 
                  onChange={e => setEmailForm(p => ({ ...p, subject: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Isi Pesan (Bisa diedit manual)</label>
                <textarea 
                  className="textarea font-mono text-sm h-64" 
                  value={emailForm.body} 
                  onChange={e => setEmailForm(p => ({ ...p, body: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEmailModal(false)} className="btn-secondary flex-1">Batal</button>
                <button 
                  onClick={() => sendEmailMutation.mutate()} 
                  disabled={sendEmailMutation.isPending || !emailForm.to} 
                  className="btn-primary flex-1 justify-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {sendEmailMutation.isPending ? 'Mengirim...' : 'Kirim Sekarang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 animate-slide-up shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">Tambah Aset / Revisi</h2>
              <button onClick={() => setShowAssetModal(false)} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-surface-100 rounded-lg">
                <button onClick={() => setAssetMode('upload')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${assetMode === 'upload' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-700'}`}>Upload File</button>
                <button onClick={() => setAssetMode('link')} className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${assetMode === 'link' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-700'}`}>Link Eksternal</button>
              </div>

              <div><label className="label">Nama File / Desain *</label><input className="input" placeholder="Logo Final V2" value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))} /></div>
              
              {assetMode === 'link' ? (
                <div><label className="label">Tautan (URL Google Drive / dll) *</label><input className="input" placeholder="https://..." value={assetForm.fileUrl} onChange={e => setAssetForm(p => ({ ...p, fileUrl: e.target.value }))} /></div>
              ) : (
                <div><label className="label">Pilih File *</label><input type="file" className="input" onChange={e => setAssetFile(e.target.files?.[0] || null)} /></div>
              )}
              
              <div><label className="label">Versi Ke-</label><input type="number" className="input" min="1" value={assetForm.version} onChange={e => setAssetForm(p => ({ ...p, version: parseInt(e.target.value) || 1 }))} /></div>
              <div><label className="label">Catatan Revisi</label><textarea className="textarea" rows={2} placeholder="Perubahan apa yang ada di versi ini?" value={assetForm.revisionNotes} onChange={e => setAssetForm(p => ({ ...p, revisionNotes: e.target.value }))} /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAssetModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={() => addAssetLink.mutate()} disabled={addAssetLink.isPending || !assetForm.name || (assetMode === 'link' ? !assetForm.fileUrl : !assetFile)} className="btn-primary flex-1 justify-center">{addAssetLink.isPending ? 'Menyimpan...' : 'Simpan Aset'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl p-6 animate-slide-up shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">Atur Invoice</h2>
              <button onClick={() => setShowInvoiceModal(false)} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="label">Item Tagihan</label>
                {invoiceItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <input className="input flex-1" placeholder="Deskripsi (Misal: Desain Logo)" value={item.description} onChange={e => { const newItems = [...invoiceItems]; newItems[i].description = e.target.value; setInvoiceItems(newItems); }} />
                    <input type="number" className="input w-20" placeholder="Qty" value={item.qty} onChange={e => { const newItems = [...invoiceItems]; newItems[i].qty = parseInt(e.target.value) || 0; setInvoiceItems(newItems); }} />
                    <input type="number" className="input w-32" placeholder="Harga" value={item.price} onChange={e => { const newItems = [...invoiceItems]; newItems[i].price = parseInt(e.target.value) || 0; setInvoiceItems(newItems); }} />
                    <button onClick={() => setInvoiceItems(invoiceItems.filter((_, idx) => idx !== i))} className="btn-danger p-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button onClick={() => setInvoiceItems([...invoiceItems, { description: '', qty: 1, price: 0 }])} className="btn-secondary btn-sm"><Plus className="w-3 h-3" /> Tambah Item</button>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-100">
                <div><label className="label">Pajak (Rp) - Opsional</label><input type="number" className="input" value={invoiceTax} onChange={e => setInvoiceTax(parseInt(e.target.value) || 0)} /></div>
                <div><label className="label">Diskon (Rp) - Opsional</label><input type="number" className="input" value={invoiceDiscount} onChange={e => setInvoiceDiscount(parseInt(e.target.value) || 0)} /></div>
                <div className="col-span-2"><label className="label">Catatan Invoice</label><textarea className="textarea" rows={2} value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowInvoiceModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={() => saveInvoice.mutate()} disabled={saveInvoice.isPending} className="btn-primary flex-1 justify-center">{saveInvoice.isPending ? 'Menyimpan...' : 'Simpan Invoice'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
