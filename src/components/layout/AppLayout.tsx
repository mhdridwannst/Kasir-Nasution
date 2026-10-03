import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  LogOut,
  Menu,
  X,
  Store,
  ShieldCheck,
  User,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      logout();
      navigate('/login');
    }
  };

  const navLinks = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/pos',
      label: 'Kasir',
      icon: ShoppingCart,
    },
    {
      to: '/products',
      label: 'Produk & Stok',
      icon: Package,
    },
    {
      to: '/transactions',
      label: 'Riwayat Transaksi',
      icon: Receipt,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-800">
      {/* Mobile Top Navigation */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold flex items-center justify-center text-sm shadow">
            N
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block">One-POS</span>
            <span className="text-[10px] text-slate-400 capitalize block leading-none">
              {user?.tenantSlug || 'Toko'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col z-40 transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-extrabold flex items-center justify-center text-lg shadow-md shadow-emerald-500/20">
              KN
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight leading-tight">Kasir Nasution</h1>
              <p className="text-[11px] text-slate-400">Inventory & POS System</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant Active Badge */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            <span className="uppercase tracking-wider font-semibold text-[10px] text-slate-400">
              Tenant Toko
            </span>
          </div>
          <p className="text-white font-semibold text-sm truncate capitalize">
            {user?.tenantSlug || 'Toko Aktif'}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RLS Multi-Tenant Aktif</span>
          </div>
        </div>

        {/* Main Nav Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout Bottom Bar */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </p>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] text-slate-400 capitalize">{user?.role || 'Staff'}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-white hover:bg-red-600/90 rounded-xl transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0 h-auto md:h-screen md:overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
