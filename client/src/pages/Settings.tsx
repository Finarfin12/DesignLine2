import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Save } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/api';

const profileSchema = z.object({ name: z.string().min(2) });
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Wajib diisi'),
  newPassword: z.string().min(8, 'Minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Password tidak sama', path: ['confirmPassword'] });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { user } = useAuthStore();
  const [profileMsg, setProfileMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');

  const { register: rp, handleSubmit: hp, formState: { errors: ep } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name },
  });
  const { register: rw, handleSubmit: hw, reset: resetPass, formState: { errors: ew } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const profileMut = useMutation({
    mutationFn: (d: ProfileForm) => api.put('/api/auth/me', d),
    onSuccess: (res) => {
      const updatedUser = res.data;
      const existing = JSON.parse(localStorage.getItem('df_user') || '{}');
      const merged = { ...existing, ...updatedUser };
      localStorage.setItem('df_user', JSON.stringify(merged));
      useAuthStore.setState({ user: merged });
      setProfileMsg('Profil berhasil disimpan!');
    },
    onError: () => setProfileMsg('Gagal menyimpan.'),
  });
  const passMut = useMutation({
    mutationFn: (d: PasswordForm) => api.post('/api/auth/change-password', d),
    onSuccess: () => { setPassMsg('Password berhasil diubah!'); resetPass(); },
    onError: () => setPassMsg('Password lama salah.'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="page-title">Settings</h1><p className="page-subtitle">Kelola akun dan preferensi kamu</p></div>

      {/* Profile */}
      <div className="card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center"><User className="w-4 h-4 text-primary-600" /></div>
          <h2 className="font-semibold text-surface-900">Profil</h2>
        </div>
        <form onSubmit={hp(d => profileMut.mutate(d))} className="space-y-4">
          <div><label className="label">Nama</label><input className="input" {...rp('name')} />{ep.name && <p className="form-error">{ep.name.message}</p>}</div>
          <div><label className="label">Email</label><input className="input bg-surface-50 cursor-not-allowed" value={user?.email ?? ''} disabled /></div>
          {profileMsg && <p className="text-sm font-medium text-emerald-600">{profileMsg}</p>}
          <button type="submit" disabled={profileMut.isPending} className="btn-primary"><Save className="w-4 h-4" />{profileMut.isPending ? 'Menyimpan...' : 'Simpan Profil'}</button>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><Lock className="w-4 h-4 text-amber-600" /></div>
          <h2 className="font-semibold text-surface-900">Ubah Password</h2>
        </div>
        <form onSubmit={hw(d => passMut.mutate(d))} className="space-y-4">
          <div><label className="label">Password Saat Ini</label><input type="password" className="input" {...rw('currentPassword')} />{ew.currentPassword && <p className="form-error">{ew.currentPassword.message}</p>}</div>
          <div><label className="label">Password Baru</label><input type="password" className="input" {...rw('newPassword')} />{ew.newPassword && <p className="form-error">{ew.newPassword.message}</p>}</div>
          <div><label className="label">Konfirmasi Password Baru</label><input type="password" className="input" {...rw('confirmPassword')} />{ew.confirmPassword && <p className="form-error">{ew.confirmPassword.message}</p>}</div>
          {passMsg && <p className={`text-sm font-medium ${passMsg.includes('berhasil') ? 'text-emerald-600' : 'text-red-600'}`}>{passMsg}</p>}
          <button type="submit" disabled={passMut.isPending} className="btn-primary"><Lock className="w-4 h-4" />{passMut.isPending ? 'Menyimpan...' : 'Ubah Password'}</button>
        </form>
      </div>
    </div>
  );
}
