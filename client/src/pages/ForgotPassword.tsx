import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Send, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      const response = await api.post('/api/auth/forgot', { email: data.email });
      setSuccessMsg(response.data.message || 'Jika email terdaftar, link reset telah dikirim.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg || 'Gagal mengirim email reset. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary-50 via-surface-50 to-surface-50 pointer-events-none" />

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <span className="font-bold text-2xl text-surface-900">Design Line</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Lupa Password?</h1>
          <p className="text-surface-500 mt-1 text-sm">Masukkan email Anda untuk menerima link reset</p>
        </div>

        {/* Card */}
        <div className="card p-8 shadow-xl shadow-surface-200/50">
          {serverError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {serverError}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              {successMsg}
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="kamu@email.com"
                  className="input"
                  {...register('email')}
                />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full justify-center btn-lg mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</span>
                ) : (
                  <><Send className="w-4 h-4" />Kirim Link Reset</>
                )}
              </button>
            </form>
          )}
          
          <div className="mt-6">
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-surface-500 hover:text-surface-700 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
