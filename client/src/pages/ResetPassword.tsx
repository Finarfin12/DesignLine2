import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../lib/api';

const schema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!token) {
      setServerError('Token tidak ditemukan. Silakan request link reset baru.');
    }
  }, [token]);

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    
    setServerError('');
    setIsLoading(true);
    try {
      await api.post('/api/auth/reset', { token, password: data.password });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg || 'Gagal reset password. Token mungkin tidak valid atau kedaluwarsa.');
    } finally {
      setIsLoading(false);
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
          <h1 className="text-2xl font-bold text-surface-900">Reset Password</h1>
          <p className="text-surface-500 mt-1 text-sm">Masukkan password baru Anda</p>
        </div>

        <div className="card p-8 shadow-xl shadow-surface-200/50">
          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {serverError}
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="flex justify-center mb-4 text-green-500">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h2 className="text-lg font-semibold text-surface-900 mb-2">Password Berhasil Diubah</h2>
              <p className="text-surface-500 mb-6 text-sm">Anda sekarang dapat login dengan password baru.</p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full justify-center btn-lg"
              >
                Pergi ke Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="password" className="label">Password Baru</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input pr-10"
                    {...register('password')}
                    disabled={!token || isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="form-error">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={!token || isLoading}
                className="btn-primary w-full justify-center btn-lg mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</span>
                ) : (
                  'Simpan Password Baru'
                )}
              </button>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-surface-500 hover:text-surface-700 transition-colors">
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
