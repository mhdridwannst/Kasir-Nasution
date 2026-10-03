import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerOwner, extractErrorMessage } from '../utils/api';
import { Store, User, Mail, Lock, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  // State Form Input
  const [storeName, setStoreName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // State UI
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const validateEmail = (emailStr: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreatedSlug(null);

    const cleanStoreName = storeName.trim();
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanStoreName || !cleanFullName || !cleanEmail || !password) {
      setErrorMsg('Semua kolom formulir wajib diisi.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setErrorMsg('Format alamat email tidak valid.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal harus terdiri dari 6 karakter.');
      return;
    }

    setLoading(true);

    try {
      const response = await registerOwner({
        storeName: cleanStoreName,
        fullName: cleanFullName,
        email: cleanEmail,
        password,
      });

      const tenantData = response?.tenant || response?.data?.tenant;
      const generatedSlug = tenantData?.slug || '';

      if (generatedSlug) {
        setCreatedSlug(generatedSlug);
      }

      // Otomatis arahkan ke halaman Login setelah 2 detik
      setTimeout(() => {
        navigate('/login', {
          state: {
            autoTenantSlug: generatedSlug,
            autoEmail: cleanEmail,
          },
        });
      }, 2000);
    } catch (err: unknown) {
      const parsedError = extractErrorMessage(
        err,
        'Gagal mendaftarkan toko baru. Silakan periksa kembali data Anda.'
      );
      setErrorMsg(parsedError);
    } finally {
      setLoading(false);
    }
  };

  // Helper Demo Fill
  const handleDemoFill = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setStoreName(`Warung Maju ${randomNum}`);
    setFullName('Sion Hartono');
    setEmail(`owner${randomNum}@warungmaju.com`);
    setPassword('rahasia123');
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 antialiased text-slate-800">
      <div className="w-full max-w-md">
        {/* Header / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white font-bold text-2xl shadow-lg shadow-slate-900/10 mb-4 ring-4 ring-white">
            <span>N</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftarkan Toko Baru
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mulai kelola sistem POS & Inventaris NexPOS Anda sekarang.
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-7 sm:p-8 shadow-xl shadow-slate-200/50">
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {createdSlug && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Registrasi Toko Berhasil!</span>
              </div>
              <p className="text-emerald-700">
                Subdomain/ID Toko Anda: <strong className="font-bold underline">{createdSlug}</strong>
              </p>
              <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mengalihkan otomatis ke halaman masuk...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field Nama Toko */}
            <div>
              <label htmlFor="storeName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Toko / Usaha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Store className="w-4 h-4" />
                </div>
                <input
                  id="storeName"
                  type="text"
                  required
                  placeholder="Contoh: Toko Berkah Sentosa"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  disabled={loading || Boolean(createdSlug)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Field Nama Lengkap Pemilik */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Lengkap Pemilik
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading || Boolean(createdSlug)}
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
                  placeholder="owner@tokoberkah.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || Boolean(createdSlug)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Field Kata Sandi */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || Boolean(createdSlug)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || Boolean(createdSlug)}
              className="w-full mt-3 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mendaftarkan Toko...
                </span>
              ) : (
                <>
                  <span>Buat Akun & Registrasi Toko</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Pengujian cepat:</span>
            <button
              type="button"
              onClick={handleDemoFill}
              disabled={loading || Boolean(createdSlug)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Fill Demo Data</span>
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Sudah mendaftarkan toko?{' '}
          <Link to="/login" className="font-semibold text-slate-900 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;