import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  fetchProducts,
  createTransaction,
  formatRupiah,
  formatDateTime,
  extractErrorMessage,
} from '../utils/api';
import { Product, CartItem, PaymentMethod, Transaction } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  Building,
  CheckCircle2,
  Printer,
  RotateCcw,
  X,
  Package,
  ArrowRight,
} from 'lucide-react';

export const Pos: React.FC = () => {
  const { user } = useAuth();

  // Master products & search state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [submittingTrx, setSubmittingTrx] = useState<boolean>(false);

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  // Load products
  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetchProducts({ limit: 100 });
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Keyboard shortcut focus search (Press '/' key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
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

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const cashChange = Math.max(0, cashReceived - grandTotal);

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    const stock = product.inventoryStocks?.[0];
    const availableQty = stock ? Number(stock.quantity) : 0;

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    const currentInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    if (currentInCart + 1 > availableQty) {
      alert(`Stok tidak mencukupi! Tersedia hanya ${availableQty} unit.`);
      return;
    }

    const price = Number(product.sellingPrice);

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      newCart[existingIndex].subtotal = newCart[existingIndex].quantity * price;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unitPrice: price,
          subtotal: price,
        },
      ]);
    }
  };

  // Update item quantity
  const handleUpdateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    const stock = product?.inventoryStocks?.[0];
    const availableQty = stock ? Number(stock.quantity) : 0;

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty > availableQty) {
              alert(`Maksimal stok tercapai (${availableQty} unit).`);
              return item;
            }
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              subtotal: nextQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove single item
  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Clear cart
  const handleClearCart = () => {
    if (cart.length > 0 && window.confirm('Kosongkan semua barang dari keranjang?')) {
      setCart([]);
      setDiscountAmount(0);
      setTaxAmount(0);
    }
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashReceived(grandTotal); // default uang pas
    setIsCheckoutOpen(true);
  };

  // Submit Transaction
  const handleProcessCheckout = async () => {
    if (paymentMethod === 'cash' && cashReceived < grandTotal) {
      alert('Uang yang diterima kurang dari total tagihan!');
      return;
    }

    setSubmittingTrx(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod,
        taxAmount,
        discountAmount,
        outletName: 'Main Outlet',
      };

      const res = await createTransaction(payload);
      setCompletedTransaction(res.data);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);

      // Refresh product stock after successful purchase
      loadProducts();
    } catch (err) {
      alert(extractErrorMessage(err, 'Gagal memproses transaksi kasir.'));
    } finally {
      setSubmittingTrx(false);
    }
  };

  // Reset for next transaction
  const handleNewTransaction = () => {
    setCart([]);
    setDiscountAmount(0);
    setTaxAmount(0);
    setCashReceived(0);
    setIsReceiptOpen(false);
    setCompletedTransaction(null);
  };

  // Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-0px)] overflow-hidden bg-slate-100">
      {/* LEFT SECTION: Catalog & Products Grid (65% width) */}
      <section className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-5 border-r border-slate-200/80">
        {/* Search & Top Action Bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari produk / barcode (tekan '/' untuk cari)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none mb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200/80'
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Memuat katalog produk...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Package className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
              <p className="text-sm font-semibold text-slate-700">Produk Tidak Ditemukan</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {searchQuery
                  ? `Tidak ada produk dengan kata kunci "${searchQuery}"`
                  : 'Belum ada produk di toko ini.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
              {filteredProducts.map((p) => {
                const stock = p.inventoryStocks?.[0];
                const availableQty = stock ? Number(stock.quantity) : 0;
                const isOutOfStock = availableQty <= 0;

                // Cek berapa yang sudah di keranjang
                const cartItem = cart.find((i) => i.product.id === p.id);
                const countInCart = cartItem ? cartItem.quantity : 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => !isOutOfStock && handleAddToCart(p)}
                    disabled={isOutOfStock}
                    className={`relative bg-white rounded-2xl p-4 border text-left flex flex-col justify-between transition-all group ${
                      isOutOfStock
                        ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                        : 'border-slate-200/80 hover:border-slate-400 hover:shadow-md cursor-pointer active:scale-98'
                    }`}
                  >
                    {/* Badge if item in cart */}
                    {countInCart > 0 && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-md">
                        {countInCart}
                      </span>
                    )}

                    <div>
                      {/* Category Tag */}
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        {p.category || 'Umum'}
                      </span>

                      {/* Product Name */}
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block font-mono">
                          {p.sku}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 block">
                          {formatRupiah(p.sellingPrice)}
                        </span>
                      </div>

                      {/* Stock level badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-red-100 text-red-700'
                            : availableQty <= 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isOutOfStock ? 'Habis' : `Stok: ${availableQty}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* RIGHT SECTION: Cart & Billing Panel (35% width) */}
      <section className="w-full lg:w-96 xl:w-[420px] bg-white flex flex-col h-auto lg:h-full border-t lg:border-t-0 shadow-lg lg:shadow-none">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-slate-900" />
            <h2 className="font-bold text-slate-900 text-base">Keranjang Kasir</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-64 lg:h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
              <ShoppingCart className="w-12 h-12 text-slate-200 mb-3 stroke-1" />
              <p className="font-semibold text-slate-700 text-sm">Keranjang Masih Kosong</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Pilih atau klik produk dari katalog sebelah kiri untuk memulai pesanan pelanggan.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-slate-900 text-xs truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {formatRupiah(item.unitPrice)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-bold text-xs text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQuantity(item.product.id, 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Subtotal & Delete */}
                <div className="text-right shrink-0 w-24">
                  <span className="font-bold text-xs text-slate-900 block">
                    {formatRupiah(item.subtotal)}
                  </span>
                  <button
                    onClick={() => handleRemoveItem(item.product.id)}
                    className="text-[11px] text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculation & Checkout Area */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatRupiah(subtotal)}</span>
            </div>

            {/* Diskon Input */}
            <div className="flex items-center justify-between">
              <span>Diskon (Rp)</span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="w-24 text-right py-1 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Total Pembayaran */}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="font-bold text-slate-900 text-sm">Total Tagihan</span>
              <span className="font-extrabold text-slate-900 text-lg">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Bayar Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* MODAL 1: CHECKOUT & PEMBAYARAN */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Pembayaran Kasir</h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Grand Total Display */}
              <div className="p-4 bg-slate-900 text-white rounded-xl text-center">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Total yang Harus Dibayar
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
                  {formatRupiah(grandTotal)}
                </p>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                      paymentMethod === 'qris'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('debit')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                      paymentMethod === 'debit'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <span>Kartu Debit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Building className="w-4 h-4 text-amber-600" />
                    <span>Transfer Bank</span>
                  </button>
                </div>
              </div>

              {/* Cash Options if 'cash' */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-lg font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashReceived(grandTotal)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000, 200000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashReceived(amt)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        {formatRupiah(amt)}
                      </button>
                    ))}
                  </div>

                  {/* Kembalian */}
                  <div className="p-3 rounded-xl bg-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Uang Kembalian:</span>
                    <span
                      className={`text-base font-extrabold ${
                        cashReceived >= grandTotal ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {cashReceived >= grandTotal
                        ? formatRupiah(cashChange)
                        : `Kurang ${formatRupiah(grandTotal - cashReceived)}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                  <p className="font-semibold">Konfirmasi Non-Tunai ({paymentMethod.toUpperCase()})</p>
                  <p className="mt-1 text-blue-700">
                    Pastikan pembayaran telah terkonfirmasi pada mesin EDC atau mutasi rekening sebelum menyelesaikan transaksi.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={submittingTrx}
                  className="w-1/3 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessCheckout}
                  disabled={submittingTrx || (paymentMethod === 'cash' && cashReceived < grandTotal)}
                  className="w-2/3 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingTrx ? (
                    <span>Memproses Transaksi...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Selesaikan Transaksi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DIGITAL RECEIPT / NOTA PEMBAYARAN */}
      {isReceiptOpen && completedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 my-6">
            {/* Header Nota */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                {user?.tenantSlug || 'NexPOS Store'}
              </h2>
              <p className="text-[11px] text-slate-500">Struk Pembayaran Resmi</p>
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                <p>No: {completedTransaction.invoiceNumber}</p>
                <p>{formatDateTime(completedTransaction.transactionDate)}</p>
                <p>Kasir: {user?.name || user?.email?.split('@')[0] || 'Kasir'}</p>
              </div>
            </div>

            {/* Item List Nota */}
            <div className="py-4 border-b border-dashed border-slate-300 space-y-2 text-xs font-mono">
              {completedTransaction.details?.map((detail, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="pr-2">
                    <p className="font-semibold text-slate-900">{detail.product?.name || 'Item'}</p>
                    <p className="text-slate-500 text-[11px]">
                      {detail.quantity} x {formatRupiah(detail.unitPrice)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    {formatRupiah(detail.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Nota */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              {Number(completedTransaction.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon</span>
                  <span>-{formatRupiah(completedTransaction.discountAmount)}</span>
                </div>
              )}
              {Number(completedTransaction.taxAmount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Pajak</span>
                  <span>+{formatRupiah(completedTransaction.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL</span>
                <span className="text-sm">{formatRupiah(completedTransaction.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span className="uppercase">Bayar ({completedTransaction.paymentMethod})</span>
                <span>{paymentMethod === 'cash' ? formatRupiah(cashReceived) : formatRupiah(completedTransaction.totalAmount)}</span>
              </div>
              {paymentMethod === 'cash' && (
                <div className="flex justify-between text-slate-600">
                  <span>Kembalian</span>
                  <span>{formatRupiah(cashChange)}</span>
                </div>
              )}
            </div>

            {/* Footer Nota */}
            <div className="text-center pt-4 text-xs text-slate-400">
              <p className="font-semibold text-slate-600">Terima Kasih atas Kunjungan Anda!</p>
              <p className="text-[10px] mt-0.5">Barang yang dibeli tidak dapat ditukar/dikembalikan.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="w-1/2 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Nota</span>
              </button>
              <button
                type="button"
                onClick={handleNewTransaction}
                className="w-1/2 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Transaksi Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pos;
