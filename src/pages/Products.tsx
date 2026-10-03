import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  restockProduct,
  formatRupiah,
  extractErrorMessage,
} from '../utils/api';
import { sounds } from '../utils/sound';
import { Product, CreateProductInput, UpdateProductInput } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  X,
  Check,
  Tag,
  Barcode,
  Layers,
  Wand2,
  ArrowUpCircle,
  Sparkles,
  Coffee,
  Utensils,
  Cookie,
  ShoppingBag,
} from 'lucide-react';

export const Products: React.FC = () => {
  const { isOwner } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState<boolean>(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Add Form State
  const [addForm, setAddForm] = useState<CreateProductInput>({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    basePrice: 0,
    sellingPrice: 0,
    initialStock: 0,
    minThreshold: 5,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateProductInput>({
    name: '',
    barcode: '',
    category: '',
    basePrice: 0,
    sellingPrice: 0,
    minThreshold: 5,
  });

  const loadProducts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchProducts({ limit: 100 });
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mengambil daftar produk dari server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Kategori unik dari data
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Helper Theme Kategori
  const getCategoryTheme = (cat?: string | null) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('kopi') || c.includes('coffee')) {
      return {
        badge: 'bg-amber-100 text-amber-900 border-amber-200',
        avatarBg: 'bg-amber-700 text-white',
        icon: Coffee,
      };
    }
    if (c.includes('makan') || c.includes('food') || c.includes('nasi')) {
      return {
        badge: 'bg-orange-100 text-orange-900 border-orange-200',
        avatarBg: 'bg-orange-600 text-white',
        icon: Utensils,
      };
    }
    if (c.includes('minum') || c.includes('drink') || c.includes('teh')) {
      return {
        badge: 'bg-cyan-100 text-cyan-900 border-cyan-200',
        avatarBg: 'bg-cyan-600 text-white',
        icon: Sparkles,
      };
    }
    if (c.includes('snack') || c.includes('camilan') || c.includes('roti')) {
      return {
        badge: 'bg-purple-100 text-purple-900 border-purple-200',
        avatarBg: 'bg-purple-600 text-white',
        icon: Cookie,
      };
    }
    return {
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      avatarBg: 'bg-slate-700 text-white',
      icon: ShoppingBag,
    };
  };

  // Filter produk
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Auto SKU Generator
  const handleGenerateSku = () => {
    const prefix = addForm.name ? addForm.name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD') : 'PRD';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setAddForm((prev) => ({ ...prev, sku: `${prefix}-${rand}` }));
  };

  // Submit Tambah Produk
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.sku.trim()) {
      alert('Nama produk dan SKU wajib diisi');
      return;
    }
    setSubmitting(true);
    try {
      await createProduct({
        ...addForm,
        name: addForm.name.trim(),
        sku: addForm.sku.trim().toUpperCase(),
        barcode: addForm.barcode?.trim() || null,
        category: addForm.category?.trim() || null,
        basePrice: Number(addForm.basePrice),
        sellingPrice: Number(addForm.sellingPrice),
        initialStock: Number(addForm.initialStock),
        minThreshold: Number(addForm.minThreshold),
      });

      sounds.playSuccessChime();
      setSuccessMsg('Produk baru berhasil ditambahkan ke inventori.');
      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        sku: '',
        barcode: '',
        category: '',
        basePrice: 0,
        sellingPrice: 0,
        initialStock: 0,
        minThreshold: 5,
      });
      loadProducts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      sounds.playAlert();
      alert(extractErrorMessage(err, 'Gagal menambahkan produk.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (p: Product) => {
    setSelectedProduct(p);
    setEditForm({
      name: p.name,
      barcode: p.barcode || '',
      category: p.category || '',
      basePrice: Number(p.basePrice),
      sellingPrice: Number(p.sellingPrice),
      minThreshold: p.inventoryStocks?.[0] ? Number(p.inventoryStocks[0].minThreshold) : 5,
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Produk
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await updateProduct(selectedProduct.id, {
        name: editForm.name?.trim(),
        barcode: editForm.barcode?.trim() || null,
        category: editForm.category?.trim() || null,
        basePrice: Number(editForm.basePrice),
        sellingPrice: Number(editForm.sellingPrice),
        minThreshold: Number(editForm.minThreshold),
      });

      sounds.playBeep();
      setSuccessMsg('Data produk berhasil diperbarui.');
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      loadProducts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      sounds.playAlert();
      alert(extractErrorMessage(err, 'Gagal memperbarui produk.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Open Quick Restock Modal
  const handleOpenRestock = (p: Product) => {
    setSelectedProduct(p);
    setRestockQty(10);
    setIsRestockModalOpen(true);
  };

  // Submit Quick Restock
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || restockQty <= 0) return;
    setSubmitting(true);
    try {
      await restockProduct(selectedProduct.id, restockQty);
      sounds.playSuccessChime();
      setSuccessMsg(`Stok ${selectedProduct.name} berhasil ditambah +${restockQty} unit.`);
      setIsRestockModalOpen(false);
      setSelectedProduct(null);
      loadProducts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      sounds.playAlert();
      alert(extractErrorMessage(err, 'Gagal menambahkan stok produk.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Hapus Produk
  const handleDeleteSubmit = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await deleteProduct(selectedProduct.id);
      sounds.playBeep();
      setSuccessMsg('Produk berhasil dihapus.');
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
      loadProducts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      sounds.playAlert();
      alert(extractErrorMessage(err, 'Gagal menghapus produk. Produk mungkin memiliki riwayat transaksi.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-slate-800" />
            <span>Katalog & Inventaris Produk</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola master barang, harga modal, harga jual, dan status stok dengan peringatan restock.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadProducts}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Alert Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={loadProducts} className="underline text-red-900">
            Coba lagi
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama, SKU, atau barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 capitalize ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th scope="col" className="px-5 py-3.5">Produk</th>
                <th scope="col" className="px-5 py-3.5">Kategori</th>
                <th scope="col" className="px-5 py-3.5">Harga Jual</th>
                {isOwner && <th scope="col" className="px-5 py-3.5">Harga Modal</th>}
                <th scope="col" className="px-5 py-3.5">Sisa Stok</th>
                <th scope="col" className="px-5 py-3.5 text-right">Aksi & Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
                      <span>Memuat data inventori...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="font-bold text-slate-700">Tidak ada produk ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'Coba gunakan kata kunci pencarian lain.'
                        : 'Klik tombol "Tambah Produk" untuk mendaftarkan barang pertama.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stock = p.inventoryStocks?.[0];
                  const qty = stock ? Number(stock.quantity) : 0;
                  const min = stock ? Number(stock.minThreshold) : 5;
                  const isOut = qty <= 0;
                  const isLow = qty <= min && !isOut;
                  const theme = getCategoryTheme(p.category);

                  const initials = p.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product Name & SKU */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${theme.avatarBg} flex items-center justify-center font-black text-xs shrink-0 shadow-2xs`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{p.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                              <span>SKU: {p.sku}</span>
                              {p.barcode && <span>• Barcode: {p.barcode}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="px-5 py-3.5">
                        {p.category ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border capitalize ${theme.badge}`}>
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>{p.category}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Harga Jual */}
                      <td className="px-5 py-3.5 font-extrabold text-slate-900 tabular-nums">
                        {formatRupiah(p.sellingPrice)}
                      </td>

                      {/* Harga Modal (Owner Only) */}
                      {isOwner && (
                        <td className="px-5 py-3.5 text-slate-500 text-xs font-semibold tabular-nums">
                          {formatRupiah(p.basePrice)}
                        </td>
                      )}

                      {/* Stok & Status */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black tabular-nums ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {qty} unit
                          </span>
                          {isLow && (
                            <span className="text-[11px] text-amber-600 font-semibold">
                              (Min: {min})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi & Quick Restock */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Restock Button */}
                          <button
                            onClick={() => handleOpenRestock(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                            title="Tambah Stok Cepat"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+ Restock</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Edit Data Produk"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: QUICK RESTOCK */}
      {isRestockModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                <span>Tambah Stok (Restock)</span>
              </h3>
              <button onClick={() => setIsRestockModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="font-bold text-sm text-slate-900">{selectedProduct.name}</p>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>SKU: {selectedProduct.sku}</span>
                  <span>
                    Stok Saat Ini: <strong>{selectedProduct.inventoryStocks?.[0]?.quantity || 0} unit</strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jumlah Tambahan Stok (Unit)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  autoFocus
                  value={restockQty || ''}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-lg font-black bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                />
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 12, 24, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRestockQty(amt)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || restockQty <= 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Konfirmasi Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH PRODUK BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Tambah Produk Baru</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Produk *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Susu Gula Aren"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      SKU / Kode *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSku}
                      className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Wand2 className="w-3 h-3" /> Auto SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KPS-001"
                    value={addForm.sku}
                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Barcode (Opsional)
                  </label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="89912345678"
                      value={addForm.barcode || ''}
                      onChange={(e) => setAddForm({ ...addForm, barcode: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Kategori
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Contoh: Minuman, Makanan, Snack"
                    value={addForm.category || ''}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="15000"
                    value={addForm.sellingPrice || ''}
                    onChange={(e) => setAddForm({ ...addForm, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Harga Modal / Beli (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="10000"
                    value={addForm.basePrice || ''}
                    onChange={(e) => setAddForm({ ...addForm, basePrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="50"
                    value={addForm.initialStock || ''}
                    onChange={(e) => setAddForm({ ...addForm, initialStock: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Batas Minimum Stok
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="5"
                    value={addForm.minThreshold || ''}
                    onChange={(e) => setAddForm({ ...addForm, minThreshold: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUK */}
      {isEditModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-slate-800" />
                <span>Edit Produk ({selectedProduct.sku})</span>
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editForm.barcode || ''}
                    onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={editForm.category || ''}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editForm.sellingPrice}
                    onChange={(e) => setEditForm({ ...editForm, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm font-black bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Harga Modal (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.basePrice}
                    onChange={(e) => setEditForm({ ...editForm, basePrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Batas Minimum Stok
                </label>
                <input
                  type="number"
                  min={0}
                  value={editForm.minThreshold}
                  onChange={(e) => setEditForm({ ...editForm, minThreshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 tabular-nums"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Perbarui Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS */}
      {isDeleteModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-slate-900 text-base">Hapus Produk?</h3>
            <p className="text-center text-xs text-slate-500 mt-1">
              Produk <strong className="text-slate-800">{selectedProduct.name}</strong> ({selectedProduct.sku}) akan dihapus permanen dari inventori.
            </p>

            <div className="flex items-center justify-center gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submitting}
                className="w-full py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="w-full py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
