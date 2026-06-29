import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await registerUser(data.name, data.email, data.password);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg || 'Registrasi gagal. Coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-primary-50 via-surface-50 to-surface-50 pointer-events-none" />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <span className="font-bold text-2xl text-surface-900">Design Line</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Buat akun baru</h1>
          <p className="text-surface-500 mt-1 text-sm">Mulai kelola proyek desain kamu</p>
        </div>

        <div className="card p-8 shadow-xl shadow-surface-200/50">
          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{serverError}</div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">Nama Lengkap</label>
              <input id="name" type="text" placeholder="John Doe" className="input" {...register('name')} />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" placeholder="kamu@email.com" className="input" {...register('email')} />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input id="password" type={showPass ? 'text' : 'password'} placeholder="Min. 8 karakter" className="input pr-10" {...register('password')} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="label">Konfirmasi Password</label>
              <input id="confirmPassword" type="password" placeholder="Ulangi password" className="input" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center btn-lg mt-2">
              {isLoading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mendaftar...</span>
                : <><UserPlus className="w-4 h-4" />Daftar</>}
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-surface-500 mt-6">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">Login</Link>
        </p>
      </div>
    </div>
  );
}
