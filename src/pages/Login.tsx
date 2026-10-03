import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../utils/api';
import { Store, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Ambil state otomatis jika di-redirect dari Register
  const autoState = location.state as { autoTenantSlug?: string; autoEmail?: string } | null;

  const [tenantSlug, setTenantSlug] = useState<string>(autoState?.autoTenantSlug || '');
  const [email, setEmail] = useState<string>(autoState?.autoEmail || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (autoState?.autoTenantSlug) {
      setTenantSlug(autoState.autoTenantSlug);
    }
    if (autoState?.autoEmail) {
      setEmail(autoState.autoEmail);
    }
  }, [autoState]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSlug = tenantSlug.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanSlug || !cleanEmail || !password) {
      setErrorMsg('Mohon isi semua kolom login.');
      return;
    }

    setLoading(true);

    try {
      await login(cleanEmail, password, cleanSlug);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const parsedError = extractErrorMessage(
        err,
        'Email, kata sandi, atau ID Toko tidak valid.'
      );
      setErrorMsg(parsedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 antialiased text-slate-800">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white font-bold text-2xl shadow-lg shadow-slate-900/10 mb-4 ring-4 ring-white">
            <span>N</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Masuk ke NexPOS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sistem Kasir & Manajemen Inventaris Multi-Tenant
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-7 sm:p-8 shadow-xl shadow-slate-200/50">
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
              <div>
                <strong className="block font-semibold">Gagal Masuk</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field Subdomain Toko */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="tenantSlug" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  ID / Subdomain Toko
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {tenantSlug ? `${tenantSlug.toLowerCase()}.nexpos.id` : 'toko.nexpos.id'}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Store className="w-4 h-4" />
                </div>
                <input
                  id="tenantSlug"
                  type="text"
                  required
                  placeholder="contoh: jawa-jevu"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Field Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Pengguna
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="owner@toko.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Field Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Sembunyikan' : 'Lihat'}</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memverifikasi...
                </span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Belum mendaftarkan toko bisnis Anda?{' '}
          <Link to="/register" className="font-semibold text-slate-900 hover:underline">
            Daftar Tenant Baru
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;