import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  fetchProducts,
  fetchTransactions,
  formatRupiah,
  formatDateTime,
} from '../utils/api';
import { Product, Transaction } from '../types';
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  Receipt,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [prodRes, trxRes] = await Promise.all([
        fetchProducts({ limit: 100 }),
        fetchTransactions({ limit: 10 }),
      ]);
      setProducts(prodRes.data || []);
      setTransactions(trxRes.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat beberapa data statistik dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Hitung metrik
  const totalProducts = products.length;

  const lowStockProducts = products.filter((p) => {
    const stock = p.inventoryStocks?.[0];
    const qty = stock ? Number(stock.quantity) : 0;
    const min = stock ? Number(stock.minThreshold) : 5;
    return qty <= min;
  });

  // Transaksi hari ini
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTransactions = transactions.filter((t) =>
    t.transactionDate.startsWith(todayStr)
  );

  const totalSalesToday = todayTransactions.reduce(
    (sum, t) => sum + Number(t.totalAmount),
    0
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Banner Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistem Operasional Aktif</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Halo, {user?.name || user?.email?.split('@')[0] || 'Pemilik'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Toko <span className="font-semibold text-slate-800 capitalize">{user?.tenantSlug}</span> siap melayani transaksi dan mengelola stok inventaris.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka Kasir POS</span>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={loadData} className="underline font-semibold ml-2">
            Coba lagi
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Penjualan Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Penjualan Hari Ini
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {formatRupiah(totalSalesToday)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {todayTransactions.length} transaksi berhasil hari ini
            </p>
          </div>
        </div>

        {/* Total Produk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Master Produk
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {totalProducts} <span className="text-sm font-normal text-slate-400">item</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Tersimpan dalam database toko</p>
          </div>
        </div>

        {/* Stok Menipis Alert */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stok Menipis!
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-bold ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {lowStockProducts.length} <span className="text-sm font-normal text-slate-400">item</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {lowStockProducts.length > 0
                ? 'Perlu dilakukan restock segera'
                : 'Semua stok dalam batas aman'}
            </p>
          </div>
        </div>

        {/* Transaksi Tercatat */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Riwayat Transaksi
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {transactions.length} <span className="text-sm font-normal text-slate-400">nota</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Semua periode yang tercatat</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Low Stock Warning & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Peringatan Stok Menipis */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">Peringatan Stok Menipis!</h2>
            </div>
            <Link
              to="/products"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Kelola Produk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-slate-100">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 stroke-1" />
                <p className="text-sm font-medium text-slate-700">Kondisi Inventaris Aman</p>
                <p className="text-xs text-slate-400 mt-0.5">Tidak ada produk di bawah batas minimum.</p>
              </div>
            ) : (
              lowStockProducts.map((p) => {
                const stock = p.inventoryStocks?.[0];
                const qty = stock ? Number(stock.quantity) : 0;
                const min = stock ? Number(stock.minThreshold) : 5;
                const isOut = qty <= 0;

                return (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        SKU: <span className="font-mono">{p.sku}</span> {p.category && `• ${p.category}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isOut
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isOut ? 'Habis (0)' : `Sisa ${qty}`}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Min: {min}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {lowStockProducts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link
                to="/products"
                className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold text-center block transition-colors"
              >
                Perbarui & Tambah Stok Produk
              </Link>
            </div>
          )}
        </div>

        {/* Right Card: Transaksi Terakhir */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-slate-700" />
              <h2 className="text-base font-bold text-slate-900">Transaksi Terbaru</h2>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center">
                <Receipt className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                <p className="text-sm font-medium text-slate-700">Belum Ada Transaksi</p>
                <p className="text-xs text-slate-400 mt-0.5">Mulai lakukan penjualan melalui menu Kasir.</p>
                <Link
                  to="/pos"
                  className="mt-3 text-xs font-semibold text-emerald-600 hover:underline"
                >
                  Buka Kasir Sekarang
                </Link>
              </div>
            ) : (
              transactions.slice(0, 5).map((trx) => (
                <div key={trx.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 font-mono">
                        {trx.invoiceNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                        {trx.paymentMethod}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDateTime(trx.transactionDate)} • Kasir:{' '}
                      <span className="text-slate-600">
                        {trx.cashier?.fullName || trx.cashier?.email?.split('@')[0] || 'Staff'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">
                      {formatRupiah(trx.totalAmount)}
                    </span>
                    <span className="block text-[11px] text-emerald-600 font-medium">
                      Selesai
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {transactions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Kasir siap digunakan:</span>
              <Link
                to="/pos"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <span>Buka Terminal Kasir</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Siap Mengelola Operasional Toko?</h3>
          <p className="text-sm text-slate-300 mt-0.5">
            Tambah produk baru ke katalog atau langsung layani pelanggan di meja kasir.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            to="/products"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors border border-slate-700"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Produk</span>
          </Link>
          <Link
            to="/pos"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Terminal Kasir</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;